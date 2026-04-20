# face-api.js model files

This app loads face-api model weights from:

- `/models` (served from `public/models`)

Place the following files into this folder (recommended for this project):

- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_tiny_model-weights_manifest.json`
- `face_landmark_68_tiny_model-shard1`

If these files are missing, the UI will still run, but proctoring will show **"Models not loaded"** and detection will be paused.

