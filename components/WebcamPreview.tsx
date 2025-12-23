/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';
import { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { COLORS } from '../types';

interface WebcamPreviewProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    resultsRef: React.MutableRefObject<HandLandmarkerResult | null>;
    isCameraReady: boolean;
}

const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17]
];

const WebcamPreview: React.FC<WebcamPreviewProps> = ({ videoRef, resultsRef, isCameraReady }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!isCameraReady) return;
        let animationFrameId: number;

        const render = () => {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            if (canvas && video && video.readyState >= 2) { 
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
                    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // 1. Draw Color Video Feed (Mirrored)
                    ctx.save();
                    ctx.scale(-1, 1);
                    ctx.translate(-canvas.width, 0);
                    ctx.globalAlpha = 1.0;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    ctx.restore();

                    // 2. Draw Landmarks
                    if (resultsRef.current?.landmarks) {
                        resultsRef.current.landmarks.forEach((landmarks, i) => {
                            const isRight = resultsRef.current?.handedness[i][0].categoryName === 'Right';
                            const color = isRight ? COLORS.right : COLORS.left;
                            ctx.strokeStyle = color;
                            ctx.fillStyle = color;
                            ctx.lineWidth = 2;

                            ctx.beginPath();
                            HAND_CONNECTIONS.forEach(([start, end]) => {
                                const p1 = landmarks[start];
                                const p2 = landmarks[end];
                                ctx.moveTo((1 - p1.x) * canvas.width, p1.y * canvas.height);
                                ctx.lineTo((1 - p2.x) * canvas.width, p2.y * canvas.height);
                            });
                            ctx.stroke();
                        });
                    }
                }
            }
            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [isCameraReady, videoRef, resultsRef]);

    if (!isCameraReady) return null;

    return (
        <div className="fixed bottom-4 right-4 w-48 h-36 bg-[#f4f1e8] border-2 border-[#1a1a1a] rounded shadow-lg overflow-hidden z-50 pointer-events-none">
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
        </div>
    );
};

export default WebcamPreview;