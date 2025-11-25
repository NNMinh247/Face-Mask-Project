import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors } from '@mediapipe/drawing_utils';
import { FACEMESH_TESSELATION } from '@mediapipe/face_mesh';
import { checkMaskQuick } from '../services/api';

const CameraCapture = ({ onCapture, label }) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    
    const isRegisterMode = label === "Lưu FaceID"; 
    
    const [step, setStep] = useState(0); 
    const [message, setMessage] = useState("Đang khởi tạo...");
    const [progress, setProgress] = useState(0);
    const [hasMask, setHasMask] = useState(false);
    
    const frameCounter = useRef(0);
    const capturedImages = useRef([]); 
    const isCapturing = useRef(false);
    const lastCheckTime = useRef(0);

    const getDistance = (p1, p2) => {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    };

    const performMaskCheck = async () => {
        if (!isRegisterMode) return;

        const now = Date.now();
        if (now - lastCheckTime.current < 500 || !webcamRef.current) return;
        
        lastCheckTime.current = now;
        const imageSrc = webcamRef.current.getScreenshot();
        
        if (imageSrc) {
            try {
                const blob = await (await fetch(imageSrc)).blob();
                const isMasked = await checkMaskQuick(blob);
                setHasMask(isMasked);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const captureCurrentFrame = useCallback(() => {
        if (isRegisterMode && hasMask) return;
        if (!webcamRef.current || isCapturing.current) return;
        
        isCapturing.current = true; 
        const imageSrc = webcamRef.current.getScreenshot();
        
        fetch(imageSrc).then(res => res.blob()).then(blob => {
            if (isRegisterMode) {
                capturedImages.current.push(blob);
                frameCounter.current = 0;
                setProgress(0);
                setStep(prev => prev + 1); 
                isCapturing.current = false; 
            } else {
                onCapture(blob); 
                isCapturing.current = false;
            }
        });
    }, [label, onCapture, hasMask, isRegisterMode]);

    const onResults = useCallback((results) => {
        performMaskCheck();

        if (!canvasRef.current) return;
        const canvasCtx = canvasRef.current.getContext('2d');
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, width, height);

        if (isRegisterMode && hasMask) {
            setMessage("🚫 YÊU CẦU BỎ KHẨU TRANG!");
            setProgress(0);
            frameCounter.current = 0;
            
            canvasCtx.strokeStyle = "red";
            canvasCtx.lineWidth = 10;
            canvasCtx.strokeRect(0, 0, width, height);
            
            canvasCtx.restore();
            return; 
        }

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            const meshColor = isRegisterMode ? '#6366f1' : '#10b981';
            drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, { color: meshColor, lineWidth: 1 });

            if (isRegisterMode) {
                if (step >= 5) { canvasCtx.restore(); return; }

                const nose = landmarks[1];
                const leftCheek = landmarks[234];
                const rightCheek = landmarks[454];
                const distLeft = Math.abs(nose.x - leftCheek.x);
                const distRight = Math.abs(nose.x - rightCheek.x);
                const yawRatio = distLeft / (distLeft + distRight); 
                const faceWidth = getDistance(leftCheek, rightCheek); 

                let isPoseCorrect = false;
                let guideText = "";

                switch(step) {
                    case 0: guideText = "1. Nhìn Thẳng"; if (yawRatio > 0.4 && yawRatio < 0.6 && faceWidth > 0.15 && faceWidth < 0.35) isPoseCorrect = true; break;
                    case 1: guideText = "2. Lại GẦN hơn"; if (faceWidth > 0.30) isPoseCorrect = true; break;
                    case 2: guideText = "3. Ra XA chút"; if (faceWidth < 0.10) isPoseCorrect = true; break;
                    case 3: guideText = "4. Quay TRÁI ⬅️"; if (yawRatio > 0.65) isPoseCorrect = true; break;
                    case 4: guideText = "5. Quay PHẢI ➡️"; if (yawRatio < 0.35) isPoseCorrect = true; break;
                    default: guideText = "Hoàn thành!";
                }

                if (isPoseCorrect) {
                    frameCounter.current += 1;
                    const maxFrames = 20; 
                    setProgress((frameCounter.current / maxFrames) * 100);
                    setMessage("✅ Giữ nguyên...");
                    if (frameCounter.current >= maxFrames) captureCurrentFrame();
                } else {
                    frameCounter.current = Math.max(0, frameCounter.current - 1); 
                    setProgress((frameCounter.current / 20) * 100);
                    setMessage(guideText);
                }
            } else {
                setMessage("✅ Sẵn sàng điểm danh");
            }

        } else {
            setMessage("⚠️ Đang tìm khuôn mặt...");
            setProgress(0);
            frameCounter.current = 0;
        }
        canvasCtx.restore();
    }, [step, label, captureCurrentFrame, hasMask, isRegisterMode]);

    useEffect(() => {
        const faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        faceMesh.onResults(onResults);

        if (webcamRef.current && webcamRef.current.video) {
            const camera = new Camera(webcamRef.current.video, {
                onFrame: async () => {
                    if (webcamRef.current?.video) await faceMesh.send({ image: webcamRef.current.video });
                },
                width: 640, height: 480
            });
            camera.start();
        }
    }, [onResults]);

    return (
        <div className="camera-container" style={{ width: '640px', height: '480px' }}>
            <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" width={640} height={480}
                videoConstraints={{ facingMode: "user" }} style={{ position: 'absolute', top: 0, left: 0, transform: 'scaleX(-1)' }} />
            <canvas ref={canvasRef} width={640} height={480} style={{ position: 'absolute', top: 0, left: 0, transform: 'scaleX(-1)' }} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', zIndex: 20 }}>
                
                <div style={{ textAlign: 'center' }}>
                    <span style={{ 
                        background: (isRegisterMode && hasMask) ? '#ef4444' : 'rgba(0,0,0,0.6)', 
                        color: '#fff', padding: '10px 25px', 
                        borderRadius: '30px', fontSize: '18px', fontWeight: 'bold', backdropFilter: 'blur(4px)',
                        border: `2px solid ${(isRegisterMode && hasMask) ? '#fca5a5' : '#10b981'}`,
                        transition: 'all 0.3s ease'
                    }}>
                        {(isRegisterMode && hasMask) ? "🚫 VUI LÒNG BỎ KHẨU TRANG!" : (step < 5 || !isRegisterMode ? message : "🎉 Hoàn tất!")}
                    </span>
                </div>

                {isRegisterMode && !hasMask && step < 5 && (
                    <div className={`guide-overlay ${progress > 20 ? 'active' : ''}`} style={{
                        width: step === 1 ? '450px' : (step === 2 ? '150px' : '280px'),
                        height: step === 1 ? '550px' : (step === 2 ? '200px' : '380px'),
                        border: `2px dashed ${progress > 50 ? '#10b981' : 'rgba(255,255,255,0.5)'}`
                    }}></div>
                )}

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                    
                    {isRegisterMode && step < 5 && (
                         <div style={{ width: '300px', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', overflow: 'hidden' }}>
                             <div style={{ width: `${hasMask ? 100 : progress}%`, height: '100%', background: hasMask ? '#ef4444' : '#10b981', transition: 'width 0.1s linear' }}></div>
                         </div>
                    )}

                    {!isRegisterMode && (
                        <button onClick={captureCurrentFrame} className="btn-primary" style={{ transform: 'scale(1.2)', boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)' }}>
                            📸 CHỤP ẢNH / ĐIỂM DANH
                        </button>
                    )}

                    {isRegisterMode && !hasMask && step < 5 && (
                        <button onClick={captureCurrentFrame} style={{ 
                            padding: '6px 12px', fontSize: '12px', background: 'transparent', color: 'rgba(255,255,255,0.7)', 
                            border: '1px solid rgba(255,255,255,0.3)', borderRadius: '15px', cursor: 'pointer'
                        }}>
                            Bỏ qua bước này &gt;&gt;
                        </button>
                    )}

                    {isRegisterMode && step === 5 && (
                         <button onClick={() => onCapture(capturedImages.current)} className="btn-primary">
                            GỬI DỮ LIỆU NGAY
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CameraCapture;