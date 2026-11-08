import React, { useRef, useState } from 'react';
import { ActiveNPCDialogue } from '../three/SchoolPopulationNPCs';

export interface MobileInputState {
  moveX: number;
  moveZ: number;
  isSprinting: boolean;
  jumpNonce: number;
}

interface MobileTouchControlsProps {
  mobileInputRef: React.MutableRefObject<MobileInputState>;
  activeDialogue: ActiveNPCDialogue | null;
  onTriggerChat: () => void;
}

export const MobileTouchControls: React.FC<MobileTouchControlsProps> = ({
  mobileInputRef,
  activeDialogue,
  onTriggerChat,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSprinting, setIsSprinting] = useState<boolean>(false);

  const MAX_RADIUS = 42;

  const updateJoystickFromPoint = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;

    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS;
      dy = (dy / dist) * MAX_RADIUS;
    }

    setKnobOffset({ x: dx, y: dy });

    const normX = Math.abs(dx) < 5 ? 0 : dx / MAX_RADIUS;
    const normZ = Math.abs(dy) < 5 ? 0 : dy / MAX_RADIUS;
    mobileInputRef.current.moveX = normX;
    mobileInputRef.current.moveZ = normZ;
  };

  const resetJoystick = () => {
    activePointerIdRef.current = null;
    setKnobOffset({ x: 0, y: 0 });
    mobileInputRef.current.moveX = 0;
    mobileInputRef.current.moveZ = 0;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateJoystickFromPoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateJoystickFromPoint(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    resetJoystick();
  };

  const handleToggleSprint = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const next = !isSprinting;
    setIsSprinting(next);
    mobileInputRef.current.isSprinting = next;
  };

  const handleJump = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    mobileInputRef.current.jumpNonce += 1;
  };

  const handleChat = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onTriggerChat();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 pointer-events-none select-none touch-none">
      {/* Bottom-Left Virtual Analog Thumbstick & D-Pad */}
      <div className="absolute bottom-5 left-5 sm:bottom-7 sm:left-7 pointer-events-auto">
        <div
          ref={padRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-slate-950/65 border-2 border-white/25 shadow-2xl flex items-center justify-center touch-none cursor-pointer"
        >
          {/* Directional Indicators */}
          <span className="absolute top-2 text-xs font-bold text-white/60 pointer-events-none">
            ▲
          </span>
          <span className="absolute bottom-2 text-xs font-bold text-white/60 pointer-events-none">
            ▼
          </span>
          <span className="absolute left-2.5 text-xs font-bold text-white/60 pointer-events-none">
            ◀
          </span>
          <span className="absolute right-2.5 text-xs font-bold text-white/60 pointer-events-none">
            ▶
          </span>

          {/* Inner Guide Ring */}
          <div className="w-16 h-16 rounded-full border border-white/15 pointer-events-none" />

          {/* Draggable Analog Thumb Knob */}
          <div
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
            className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 border-2 border-slate-900 shadow-lg flex items-center justify-center pointer-events-none transition-transform duration-75"
          >
            <div className="w-5 h-5 rounded-full bg-red-600" />
          </div>
        </div>
      </div>

      {/* Bottom-Right Action Buttons (Jump, Sprint, Chat NPC) */}
      <div className="absolute bottom-5 right-5 sm:bottom-7 sm:right-7 flex items-end gap-3 pointer-events-auto">
        <div className="flex flex-col items-center gap-2.5">
          {/* Manual Speech / Bicara Button */}
          <button
            type="button"
            onPointerDown={handleChat}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 font-bold text-xs flex flex-col items-center justify-center shadow-xl transition-transform active:scale-90 touch-none ${
              activeDialogue
                ? 'bg-amber-500 border-white text-slate-950'
                : 'bg-slate-950/75 border-white/30 text-white hover:bg-slate-900'
            }`}
          >
            <span className="text-base leading-none">💬</span>
            <span className="text-[10px] mt-0.5">Bicara</span>
          </button>

          {/* Sprint / Lari Toggle Button */}
          <button
            type="button"
            onPointerDown={handleToggleSprint}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 font-bold text-xs flex flex-col items-center justify-center shadow-xl transition-transform active:scale-90 touch-none ${
              isSprinting
                ? 'bg-red-600 border-white text-white'
                : 'bg-slate-950/75 border-white/30 text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span className="text-sm leading-none">⚡</span>
            <span className="text-[10px] mt-0.5">{isSprinting ? 'Lari ON' : 'Lari'}</span>
          </button>
        </div>

        {/* Primary Jump Button */}
        <button
          type="button"
          onPointerDown={handleJump}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-600/90 hover:bg-emerald-500 active:scale-90 border-2 border-white text-white font-bold shadow-2xl flex flex-col items-center justify-center transition-transform touch-none"
        >
          <span className="text-xl sm:text-2xl leading-none">⬆</span>
          <span className="text-[11px] sm:text-xs mt-0.5">Lompat</span>
        </button>
      </div>
    </div>
  );
};
