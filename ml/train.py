"""AVIS training pipeline (PyTorch).

Trains a MobileNetV2 leaf-disease classifier on dataset/train, splits dataset/val
into a validation half (model selection + temperature calibration) and a held-out
test half (reported metrics only), then exports an ONNX model that the AVIS web
app runs fully on-device.

Fixes the known issues of the original Keras prototype (see legacy/):
  * deterministic seeds and a real held-out test split
  * class-weighted loss for the 11x class imbalance
  * two-stage training: frozen backbone, then fine-tune the top blocks
  * temperature scaling so displayed confidence is calibrated
  * the exported graph takes plain RGB in [0, 1] (no BGR/RGB mix-ups) and also
    returns class activation maps so the app can show *where* it saw disease

Usage:  python ml/train.py [--epochs-head 3] [--epochs-ft 4]
"""
import argparse
import hashlib
import json
import os
import random
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "dataset"
OUT_MODEL = ROOT / "app" / "public" / "model"
OUT_RESULTS = ROOT / "ml" / "results"
IMG = 224
SEED = 42
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]
EXTS = {".jpg", ".jpeg", ".png"}


def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def list_split(split, classes):
    items = []
    for ci, c in enumerate(classes):
        for p in sorted((DATA / split / c).iterdir()):
            if p.suffix.lower() in EXTS:
                items.append((p, ci))
    return items


def hash_half(path):
    # Stable, order-independent assignment of each val image to val or test.
    return int(hashlib.md5(path.name.encode()).hexdigest(), 16) % 2


class Leaves(Dataset):
    def __init__(self, items, tf):
        self.items, self.tf = items, tf

    def __len__(self):
        return len(self.items)

    def __getitem__(self, i):
        p, y = self.items[i]
        return self.tf(Image.open(p).convert("RGB")), y


class AvisNet(nn.Module):
    """MobileNetV2 backbone + linear head; normalisation lives inside the graph."""

    def __init__(self, n_classes):
        super().__init__()
        base = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
        self.features = base.features
        self.dropout = nn.Dropout(0.2)
        self.fc = nn.Linear(1280, n_classes)
        self.register_buffer("mean", torch.tensor(MEAN).view(1, 3, 1, 1))
        self.register_buffer("std", torch.tensor(STD).view(1, 3, 1, 1))

    def forward(self, x):
        f = self.features((x - self.mean) / self.std)
        return self.fc(self.dropout(f.mean((2, 3))))


class ExportNet(nn.Module):
    """Inference graph: RGB [0,1] NCHW -> (calibrated probs, per-class CAM 7x7)."""

    def __init__(self, net, temperature):
        super().__init__()
        self.net, self.t = net, float(temperature)

    def forward(self, x):
        f = self.net.features((x - self.net.mean) / self.net.std)
        logits = self.net.fc(f.mean((2, 3)))
        probs = torch.softmax(logits / self.t, dim=1)
        cam = torch.einsum("nkhw,ck->nchw", f, self.net.fc.weight)
        return probs, cam


@torch.no_grad()
def predict(net, loader):
    net.eval()
    logits, ys = [], []
    for x, y in loader:
        logits.append(net(x))
        ys.append(y)
    return torch.cat(logits), torch.cat(ys)


def fit_temperature(logits, ys):
    t = torch.ones(1, requires_grad=True)
    opt = torch.optim.LBFGS([t], lr=0.05, max_iter=200)

    def step():
        opt.zero_grad()
        loss = F.cross_entropy(logits / t.clamp(min=0.05), ys)
        loss.backward()
        return loss

    opt.step(step)
    return float(t.clamp(min=0.05))


def ece(probs, ys, bins=10):
    conf, pred = probs.max(1)
    acc = (pred == ys).float()
    total = 0.0
    for lo in np.linspace(0, 1, bins + 1)[:-1]:
        m = (conf > lo) & (conf <= lo + 1 / bins)
        if m.any():
            total += m.float().mean() * abs(acc[m].mean() - conf[m].mean())
    return float(total)


def run_epochs(net, loader, val_loader, params, epochs, lr, weights, tag):
    opt = torch.optim.AdamW(params, lr=lr, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=max(1, epochs * len(loader)))
    hist = []
    for ep in range(epochs):
        net.train()
        t0, seen, correct, total_loss = time.time(), 0, 0, 0.0
        for x, y in loader:
            opt.zero_grad()
            out = net(x)
            loss = F.cross_entropy(out, y, weight=weights, label_smoothing=0.05)
            loss.backward()
            opt.step()
            sched.step()
            seen += len(y)
            correct += (out.argmax(1) == y).sum().item()
            total_loss += loss.item() * len(y)
        vl, vy = predict(net, val_loader)
        vacc = (vl.argmax(1) == vy).float().mean().item()
        row = dict(stage=tag, epoch=ep + 1, train_loss=total_loss / seen,
                   train_acc=correct / seen, val_acc=vacc,
                   val_loss=F.cross_entropy(vl, vy).item(), sec=time.time() - t0)
        hist.append(row)
        print(json.dumps(row), flush=True)
    return hist


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs-head", type=int, default=3)
    ap.add_argument("--epochs-ft", type=int, default=4)
    ap.add_argument("--batch", type=int, default=32)
    args = ap.parse_args()

    set_seed(SEED)
    torch.set_num_threads(os.cpu_count() or 4)
    classes = sorted(d.name for d in (DATA / "train").iterdir() if d.is_dir())
    train_items = list_split("train", classes)
    val_all = list_split("val", classes)
    val_items = [it for it in val_all if hash_half(it[0]) == 0]
    test_items = [it for it in val_all if hash_half(it[0]) == 1]
    print(f"classes={classes}\ntrain={len(train_items)} val={len(val_items)} test={len(test_items)}")

    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(IMG, scale=(0.6, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(20),
        # Field photos are messier than lab photos: vary light and colour.
        transforms.ColorJitter(0.35, 0.35, 0.3, 0.03),
        transforms.RandomApply([transforms.GaussianBlur(5)], p=0.2),
        transforms.ToTensor(),
    ])
    eval_tf = transforms.Compose([transforms.Resize((IMG, IMG)), transforms.ToTensor()])

    workers = min(6, os.cpu_count() or 2)
    train_loader = DataLoader(Leaves(train_items, train_tf), batch_size=args.batch,
                              shuffle=True, num_workers=workers, persistent_workers=True)
    val_loader = DataLoader(Leaves(val_items, eval_tf), batch_size=64, num_workers=workers)
    test_loader = DataLoader(Leaves(test_items, eval_tf), batch_size=64, num_workers=workers)

    counts = np.bincount([y for _, y in train_items], minlength=len(classes))
    weights = torch.tensor(counts.sum() / (len(classes) * counts), dtype=torch.float32)
    print("class weights:", [round(w, 2) for w in weights.tolist()])

    net = AvisNet(len(classes))
    t_start = time.time()

    # Stage 1: train only the head on a frozen ImageNet backbone.
    for p in net.features.parameters():
        p.requires_grad = False
    hist = run_epochs(net, train_loader, val_loader, net.fc.parameters(),
                      args.epochs_head, 1e-3, weights, "head")

    # Stage 2: unfreeze the top inverted-residual blocks and fine-tune gently.
    for p in net.features[14:].parameters():
        p.requires_grad = True
    params = [p for p in net.parameters() if p.requires_grad]
    hist += run_epochs(net, train_loader, val_loader, params, args.epochs_ft, 3e-4, weights, "finetune")
    train_minutes = (time.time() - t_start) / 60

    # Calibrate on validation, report on the untouched test half.
    vl, vy = predict(net, val_loader)
    temperature = fit_temperature(vl, vy)
    tl, ty = predict(net, test_loader)
    probs = torch.softmax(tl / temperature, 1)
    pred = probs.argmax(1)

    from sklearn.metrics import classification_report, confusion_matrix
    report = classification_report(ty, pred, target_names=classes, output_dict=True, zero_division=0)
    cm = confusion_matrix(ty, pred).tolist()
    metrics = dict(
        classes=classes, temperature=temperature,
        test_accuracy=report["accuracy"], test_macro_f1=report["macro avg"]["f1-score"],
        test_ece_raw=ece(torch.softmax(tl, 1), ty), test_ece_calibrated=ece(probs, ty),
        per_class={c: {k: round(report[c][k], 4) for k in ("precision", "recall", "f1-score", "support")}
                   for c in classes},
        confusion_matrix=cm, history=hist,
        split=dict(train=len(train_items), val=len(val_items), test=len(test_items)),
        train_minutes=round(train_minutes, 1), seed=SEED, torch=torch.__version__,
    )
    OUT_RESULTS.mkdir(parents=True, exist_ok=True)
    OUT_MODEL.mkdir(parents=True, exist_ok=True)
    (OUT_RESULTS / "metrics.json").write_text(json.dumps(metrics, indent=2))
    torch.save(net.state_dict(), OUT_RESULTS / "avis_mobilenetv2.pt")
    print(f"TEST acc={metrics['test_accuracy']:.4f} macroF1={metrics['test_macro_f1']:.4f} "
          f"T={temperature:.3f} ECE {metrics['test_ece_raw']:.4f}->{metrics['test_ece_calibrated']:.4f}")

    plot(metrics)

    export = ExportNet(net.eval(), temperature).eval()
    dummy = torch.rand(1, 3, IMG, IMG)
    onnx_path = OUT_MODEL / "avis.onnx"
    torch.onnx.export(export, dummy, str(onnx_path), input_names=["image"],
                      output_names=["probs", "cam"], opset_version=17, dynamo=False)
    (OUT_MODEL / "model-info.json").write_text(json.dumps(dict(
        classes=classes, input=[1, 3, IMG, IMG], temperature=temperature,
        test_accuracy=metrics["test_accuracy"], test_macro_f1=metrics["test_macro_f1"],
        test_images=len(test_items), version=time.strftime("%Y-%m-%d"),
    ), indent=2))

    import onnxruntime as ort
    sess = ort.InferenceSession(str(onnx_path))
    o = sess.run(None, {"image": dummy.numpy()})
    ref = export(dummy)[0].detach().numpy()
    print("onnx max diff:", float(np.abs(o[0] - ref).max()), "size MB:", onnx_path.stat().st_size / 1e6)


def plot(m):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    h = m["history"]
    x = range(1, len(h) + 1)
    fig, ax = plt.subplots(1, 2, figsize=(10, 4))
    ax[0].plot(x, [r["train_acc"] for r in h], label="train")
    ax[0].plot(x, [r["val_acc"] for r in h], label="validation")
    ax[0].set_title("Accuracy"); ax[0].set_xlabel("epoch"); ax[0].legend(); ax[0].grid(alpha=.3)
    ax[1].plot(x, [r["train_loss"] for r in h], label="train")
    ax[1].plot(x, [r["val_loss"] for r in h], label="validation")
    ax[1].set_title("Loss"); ax[1].set_xlabel("epoch"); ax[1].legend(); ax[1].grid(alpha=.3)
    fig.tight_layout(); fig.savefig(OUT_RESULTS / "training_curves.png", dpi=120); plt.close(fig)

    cm = np.array(m["confusion_matrix"])
    fig, ax = plt.subplots(figsize=(7, 6))
    ax.imshow(cm, cmap="Greens")
    ax.set_xticks(range(len(m["classes"])), m["classes"], rotation=45, ha="right")
    ax.set_yticks(range(len(m["classes"])), m["classes"])
    for i in range(len(cm)):
        for j in range(len(cm)):
            ax.text(j, i, cm[i, j], ha="center", va="center",
                    color="white" if cm[i, j] > cm.max() / 2 else "black")
    ax.set_xlabel("predicted"); ax.set_ylabel("true"); ax.set_title("Held-out test confusion matrix")
    fig.tight_layout(); fig.savefig(OUT_RESULTS / "confusion_matrix.png", dpi=120); plt.close(fig)


if __name__ == "__main__":
    main()
