"use client";

import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  youtubeId:  string;
  title:      string;
  onProgress?: (percent: number) => void;
  onComplete?: () => void;
}

export default function VideoPlayer({ youtubeId, title, onProgress, onComplete }: VideoPlayerProps) {
  const [watched, setWatched] = useState(0);
  const lastReportedRef = useRef<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // YouTube embed with postMessage API for progress tracking
  const src = `https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&rel=0&modestbranding=1&fs=1`;

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      // Validate origin to prevent spoofed messages
      if (e.origin !== "https://www.youtube.com" || !e.data) return;
      
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        
        // Check for video ended (state = 0)
        if (data?.event === "onStateChange" && data?.info === 0) {
          setWatched(100);
          onProgress?.(100);
          onComplete?.();
          lastReportedRef.current = 100;
          return;
        }
        
        // Check for progress info delivery
        if (data?.event === "infoDelivery" && data?.info) {
          const info = data.info;
          if (info.currentTime !== undefined && info.duration !== undefined && info.duration > 0) {
            const percent = Math.round((info.currentTime / info.duration) * 100);
            
            // Report at milestones: 25%, 50%, 75%, 100%
            const milestones = [25, 50, 75, 100];
            const reachedMilestone = milestones.some(
              m => percent >= m && lastReportedRef.current < m
            );
            
            if (reachedMilestone) {
              setWatched(percent);
              onProgress?.(percent);
              lastReportedRef.current = percent;
            }
          }
        }
      } catch (err) {
        // Ignore parse errors silently
      }
    };

    const intervalId = setInterval(() => {
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            '{"event":"listening","id":"ranktrack"}', 
            "https://www.youtube.com"
          );
        } catch (e) {
          // Cross-origin restriction - ignore
        }
      }
    }, 2000);

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(intervalId);
    };
  }, [onProgress, onComplete]);

  return (
    <div className="w-full">
      <div className="w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden">
        <iframe
          ref={iframeRef}
          id="ytplayer"
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
      {watched > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 bg-gray-800 rounded-full">
            <div 
              className="h-1 bg-green-500 rounded-full transition-all duration-300" 
              style={{ width: `${watched}%` }}
            />
          </div>
          <span className="text-xs text-green-400">{watched}% watched</span>
        </div>
      )}
    </div>
  );
}
