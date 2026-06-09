import cv2
import numpy as np
import os
import urllib.request
import requests

class AIEngine:
    def __init__(self):
        self.model_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'yolov8n.onnx')
        self.net = None
        self.classes = []
        self.is_simulation = False
        
        # State tracking dictionary to prevent flickering (temporal smoothing)
        # Structure: { track_id: { 'box': [x1,y1,x2,y2], 'class': 'person', 'confidence': 0.85, 'life': 8 } }
        self.tracks = {}
        self.next_track_id = 0
        
        # COCO class names (80 classes)
        self.classes = [
            "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
            "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
            "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
            "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
            "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
            "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
            "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake",
            "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop",
            "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
            "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
        ]

        # Download ONNX model if not present (only 12MB, loads instantly on OpenCV DNN)
        if not os.path.exists(self.model_path):
            try:
                print(f"[AI Engine] Downloading YOLOv8 ONNX model weights (12MB)...")
                url = "https://huggingface.co/Kalray/yolov8/resolve/main/yolov8n.onnx"
                response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, stream=True)
                response.raise_for_status()
                with open(self.model_path, 'wb') as out_file:
                    for chunk in response.iter_content(chunk_size=8192):
                        out_file.write(chunk)
                print("[AI Engine] Download complete.")
            except Exception as e:
                print(f"[AI Engine] Error downloading model: {e}. Falling back to simulated mode.")
                self.is_simulation = True

        if not self.is_simulation:
            try:
                # Load ONNX model via OpenCV DNN
                self.net = cv2.dnn.readNetFromONNX(self.model_path)
                self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                print("[AI Engine] OpenCV DNN YOLOv8 loaded successfully.")
            except Exception as e:
                print(f"[AI Engine] Error loading ONNX model via OpenCV DNN: {e}. Falling back to simulation.")
                self.is_simulation = True

    def calculate_iou(self, boxA, boxB):
        """
        Calculates Intersection over Union (IoU) of two bounding boxes.
        Boxes are format: [x1, y1, x2, y2]
        """
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interArea = max(0, xB - xA) * max(0, yB - yA)
        boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
        boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])

        if float(boxAArea + boxBArea - interArea) == 0:
            return 0
            
        return interArea / float(boxAArea + boxBArea - interArea)

    def detect(self, frame):
        """
        Runs real YOLOv8 object detection via OpenCV DNN with custom temporal tracking stability.
        """
        if frame is None:
            return None, []

        if self.is_simulation:
            return self.detect_haarcascade(frame)

        try:
            h, w, _ = frame.shape
            
            # YOLOv8 input shape is 640x640
            blob = cv2.dnn.blobFromImage(frame, 1/255.0, (640, 640), swapRB=True, crop=False)
            self.net.setInput(blob)
            
            # Run forward pass
            outputs = self.net.forward()
            predictions = np.squeeze(outputs).T
            
            boxes = []
            confidences = []
            class_ids = []
            
            # Filter output detections
            for pred in predictions:
                scores = pred[4:]
                class_id = np.argmax(scores)
                confidence = scores[class_id]
                
                if confidence > 0.25:  # Lower raw threshold to capture phones/objects at low confidence
                    cx, cy, bw, bh = pred[0:4]
                    x1 = int((cx - bw / 2) * (w / 640.0))
                    y1 = int((cy - bh / 2) * (h / 640.0))
                    x2 = int((cx + bw / 2) * (w / 640.0))
                    y2 = int((cy + bh / 2) * (h / 640.0))
                    
                    boxes.append([x1, y1, x2 - x1, y2 - y1])
                    confidences.append(float(confidence))
                    class_ids.append(class_id)

            # Apply Non-Maximum Suppression (NMS)
            indices = cv2.dnn.NMSBoxes(boxes, confidences, 0.25, 0.4)
            
            raw_dets = []
            if len(indices) > 0:
                for idx in indices.flatten():
                    x, y, bw, bh = boxes[idx]
                    x1, y1 = max(0, x), max(0, y)
                    x2, y2 = min(w, x + bw), min(h, y + bh)
                    raw_dets.append({
                        'box': [x1, y1, x2, y2],
                        'class': self.classes[class_ids[idx]],
                        'confidence': confidences[idx]
                    })

            # --- Temporal Tracking Logic (Smoothing/Hysteresis) ---
            # Decrement life of all current tracks
            for tid in list(self.tracks.keys()):
                self.tracks[tid]['life'] -= 1

            # Match raw detections with existing tracks
            for det in raw_dets:
                best_iou = 0
                best_tid = None
                
                for tid, track in self.tracks.items():
                    if track['class'] == det['class']:
                        iou = self.calculate_iou(track['box'], det['box'])
                        if iou > best_iou:
                            best_iou = iou
                            best_tid = tid
                
                # If matched (IoU threshold 0.3), update the track coordinates and refresh life
                if best_iou > 0.3 and best_tid is not None:
                    # Smoothing coordinates (weighted average)
                    old_box = self.tracks[best_tid]['box']
                    new_box = det['box']
                    smoothed_box = [
                        int(old_box[0] * 0.4 + new_box[0] * 0.6),
                        int(old_box[1] * 0.4 + new_box[1] * 0.6),
                        int(old_box[2] * 0.4 + new_box[2] * 0.6),
                        int(old_box[3] * 0.4 + new_box[3] * 0.6)
                    ]
                    self.tracks[best_tid]['box'] = smoothed_box
                    self.tracks[best_tid]['confidence'] = det['confidence']
                    self.tracks[best_tid]['life'] = 1  # Instant disappear
                else:
                    # No match found, create a new track
                    self.tracks[self.next_track_id] = {
                        'box': det['box'],
                        'class': det['class'],
                        'confidence': det['confidence'],
                        'life': 1
                    }
                    self.next_track_id += 1

            # Filter out dead tracks and collect active ones
            detections_list = []
            annotated_frame = frame.copy()

            for tid in list(self.tracks.keys()):
                track = self.tracks[tid]
                if track['life'] <= 0:
                    del self.tracks[tid]
                else:
                    detections_list.append({
                        'box': track['box'],
                        'class': track['class'],
                        'confidence': track['confidence']
                    })
                    
                    x1, y1, x2, y2 = track['box']
                    # Draw box on server visual preview
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (124, 58, 237), 2)
                    label = f"{track['class'].upper()} {int(track['confidence'] * 100)}%"
                    cv2.putText(annotated_frame, label, (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (124, 58, 237), 2)

            return annotated_frame, detections_list

        except Exception as e:
            print(f"[AI Engine] ONNX inference failed: {e}. Falling back to Haar Cascade.")
            return self.detect_haarcascade(frame)

    def detect_haarcascade(self, frame):
        h, w, _ = frame.shape
        detections_list = []
        annotated_frame = frame.copy()
        
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        for (x, y, bw, bh) in faces:
            detections_list.append({
                'box': [int(x), int(y), int(x + bw), int(y + bh)],
                'class': 'person (face)',
                'confidence': 0.95
            })
            cv2.rectangle(annotated_frame, (x, y), (x+bw, y+bh), (124, 58, 237), 2)
            cv2.putText(annotated_frame, "PERSON 95%", (x, y - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (124, 58, 237), 2)
                        
        return annotated_frame, detections_list

ai_engine = AIEngine()
