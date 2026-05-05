import cv2
import numpy as np
import time
import os
import tensorflow as tf

IMG_SIZE = 224
CLASSES = ['bell-pepper-diseased', 'bell-pepper-healthy', 'potato-diseased', 'potato-healthy', 'tomato-diseased', 'tomato-healthy']

model = tf.keras.models.load_model("plant_model.h5")
print("Using H5 model")

cap = cv2.VideoCapture(0)
prev_time = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    display_frame = frame.copy()

    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

    lower_green = np.array([35, 40, 40])
    upper_green = np.array([85, 255, 255])

    mask = cv2.inRange(hsv, lower_green, upper_green)

    kernel = np.ones((5,5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_DILATE, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    label = "No Plant"
    confidence = 0

    if contours:
        largest = max(contours, key=cv2.contourArea)

        if cv2.contourArea(largest) > 2000:
            x, y, w, h = cv2.boundingRect(largest)
            plant_roi = frame[y:y+h, x:x+w]

            img = cv2.resize(plant_roi, (IMG_SIZE, IMG_SIZE))
            img = img.astype(np.float32) / 255.0
            img = np.expand_dims(img, axis=0)

            prediction = model.predict(img, verbose=0)[0]

            label = CLASSES[np.argmax(prediction)]
            confidence = float(np.max(prediction))

            if "healthy" in label:
                color = (0, 255, 0)   # Green
            else:
                color = (0, 0, 255)   # Red

            cv2.rectangle(display_frame, (x, y), (x+w, y+h), color, 4)

            # Draw label text
            cv2.putText(display_frame,
            f"{label} ({confidence:.2f})",
            (x, y-10),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.75,
            color,
            4)


    curr_time = time.time()
    fps = 1 / (curr_time - prev_time) if prev_time != 0 else 0
    prev_time = curr_time

    cv2.putText(display_frame,
                f"FPS: {fps:.1f}",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255,255,255),
                2)

    cv2.imshow("Plant Disease Detection", display_frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
