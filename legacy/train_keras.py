import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import matplotlib.pyplot as plt
import numpy as np
import os
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay

IMG_SIZE = 224
BATCH = 16
EPOCHS = 10

train_dir = "dataset/train"
val_dir = "dataset/val"
results_dir = "results"
os.makedirs(results_dir, exist_ok=True)

train_gen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=20,
    zoom_range=0.2,
    horizontal_flip=True
)

val_gen = ImageDataGenerator(rescale=1./255)

train_data = train_gen.flow_from_directory(
    train_dir,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH,
    class_mode="categorical",
    shuffle=True
)

val_data = val_gen.flow_from_directory(
    val_dir,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH,
    class_mode="categorical",
    shuffle=False   # IMPORTANT for confusion matrix
)

class_names = list(train_data.class_indices.keys())
print("Classes:", class_names)

base_model = tf.keras.applications.MobileNetV2(
    input_shape=(224,224,3),
    include_top=False,
    weights="imagenet"
)
base_model.trainable = False

model = tf.keras.Sequential([
    base_model,
    tf.keras.layers.GlobalAveragePooling2D(),
    tf.keras.layers.Dense(128, activation="relu"),
    tf.keras.layers.Dense(train_data.num_classes, activation="softmax")
])

model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()

history = model.fit(
    train_data,
    validation_data=val_data,
    epochs=EPOCHS
)

model.save("plant_model.h5")

epochs_range = range(1, EPOCHS + 1)

plt.figure()
plt.plot(epochs_range, history.history['accuracy'])
plt.plot(epochs_range, history.history['val_accuracy'])
plt.title("Accuracy vs Epochs")
plt.xlabel("Epoch")
plt.ylabel("Accuracy")
plt.legend(["Training", "Validation"])
plt.grid(True)
plt.savefig(os.path.join(results_dir, "accuracy.png"))
plt.close()

plt.figure()
plt.plot(epochs_range, history.history['loss'])
plt.plot(epochs_range, history.history['val_loss'])
plt.title("Loss vs Epochs")
plt.xlabel("Epoch")
plt.ylabel("Loss")
plt.legend(["Training", "Validation"])
plt.grid(True)
plt.savefig(os.path.join(results_dir, "loss.png"))
plt.close()

print("Generating confusion matrix...")

val_steps = val_data.samples // BATCH + 1
predictions = model.predict(val_data, steps=val_steps)
predicted_classes = np.argmax(predictions, axis=1)
true_classes = val_data.classes

cm = confusion_matrix(true_classes, predicted_classes)

disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=class_names)
disp.plot(cmap="Blues", xticks_rotation=45)

plt.title("Confusion Matrix")
plt.tight_layout()
plt.savefig(os.path.join(results_dir, "confusion_matrix.png"))
plt.close()

print("✅ Training complete!")
print("📁 Results saved in:", results_dir)
