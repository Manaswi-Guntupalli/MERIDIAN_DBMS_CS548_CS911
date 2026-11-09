// Capture pixels only. All face detection, embeddings and identity matching run on the server.
let canvas: HTMLCanvasElement | undefined;
export function captureFrameBase64(video: HTMLVideoElement, maxWidth = 640): string {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return '';
  canvas ??= document.createElement('canvas');
  const scale = Math.min(1, maxWidth / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) return '';
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85).split(',', 2)[1];
}
