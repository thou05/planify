'use client';

import React, { memo } from 'react';
import {
  DoodleRocket,
  DoodleKanban,
  DoodleStickyNote,
  DoodleChecklist,
  DoodleCoffee,
  DoodleIdeaBulb,
  DoodleClock,
  DoodleTarget,
  DoodleChat,
  DoodleMascot,
  DoodleFolder,
  DoodleTrophy,
} from '@/components/playful/DoodleIcons';

export interface PlayfulBackgroundProps {
  /** 'landing' rải đều theo hero, 'auth' tập trung 2 bên viền để trống giữa */
  variant?: 'landing' | 'auth';
  className?: string;
  showGlowOrbs?: boolean;
}

interface DoodlePosition {
  id: string;
  Component: React.FC<{ className?: string }>;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  size: string;
  rotate: string;
  animationClass: string;
  delay: string;
  opacity: string;
}

export const PlayfulBackground: React.FC<PlayfulBackgroundProps> = memo(({
  variant = 'auth',
  className = '',
  showGlowOrbs = true,
}) => {
  // Cấu hình tọa độ Safe Zone nghiêm ngặt cho cụm Auth: 
  // Tuyệt đối không đè vào khung trung tâm (left 20% - 80%)
  const authPositions: DoodlePosition[] = [
    // Biên trái (0% - 18%)
    { id: 'rocket', Component: DoodleRocket, top: '8%', left: '4%', size: 'w-14 h-14 sm:w-18 sm:h-18 lg:w-20 lg:h-20', rotate: '-12deg', animationClass: 'animate-doodle-float-slow', delay: '0s', opacity: 'opacity-85 dark:opacity-75 max-md:opacity-60' },
    { id: 'kanban', Component: DoodleKanban, top: '28%', left: '6%', size: 'w-12 h-12 sm:w-16 sm:h-16', rotate: '8deg', animationClass: 'animate-doodle-bob-gentle', delay: '1.2s', opacity: 'opacity-80 dark:opacity-70 max-md:opacity-55' },
    { id: 'coffee', Component: DoodleCoffee, top: '50%', left: '3%', size: 'w-12 h-12 sm:w-16 sm:h-16', rotate: '-6deg', animationClass: 'animate-doodle-float-alt', delay: '0.6s', opacity: 'opacity-85 dark:opacity-75 max-md:opacity-60' },
    { id: 'idea', Component: DoodleIdeaBulb, top: '72%', left: '5%', size: 'w-12 h-12 sm:w-16 sm:h-16 lg:w-18 lg:h-18', rotate: '14deg', animationClass: 'animate-doodle-wiggle-soft', delay: '2s', opacity: 'opacity-80 dark:opacity-70 max-md:opacity-55' },
    { id: 'target', Component: DoodleTarget, bottom: '6%', left: '4%', size: 'w-12 h-12 sm:w-16 sm:h-16', rotate: '-10deg', animationClass: 'animate-doodle-bob-gentle', delay: '1.8s', opacity: 'opacity-85 dark:opacity-75 max-md:opacity-60' },

    // Biên phải (82% - 100%)
    { id: 'mascot', Component: DoodleMascot, top: '10%', right: '4%', size: 'w-14 h-14 sm:w-18 sm:h-18 lg:w-20 lg:h-20', rotate: '10deg', animationClass: 'animate-doodle-bob-gentle', delay: '0.4s', opacity: 'opacity-90 dark:opacity-80 max-md:opacity-65' },
    { id: 'sticky', Component: DoodleStickyNote, top: '30%', right: '6%', size: 'w-12 h-12 sm:w-16 sm:h-16', rotate: '-8deg', animationClass: 'animate-doodle-float-slow', delay: '1.6s', opacity: 'opacity-80 dark:opacity-70 max-md:opacity-55' },
    { id: 'trophy', Component: DoodleTrophy, top: '52%', right: '4%', size: 'w-12 h-12 sm:w-16 sm:h-16 lg:w-18 lg:h-18', rotate: '6deg', animationClass: 'animate-doodle-wiggle-soft', delay: '0.8s', opacity: 'opacity-85 dark:opacity-75 max-md:opacity-60' },
    { id: 'checklist', Component: DoodleChecklist, top: '70%', right: '7%', size: 'w-12 h-12 sm:w-16 sm:h-16', rotate: '-12deg', animationClass: 'animate-doodle-float-alt', delay: '2.2s', opacity: 'opacity-80 dark:opacity-70 max-md:opacity-55' },
    { id: 'clock', Component: DoodleClock, bottom: '6%', right: '5%', size: 'w-12 h-12 sm:w-16 sm:h-16', rotate: '8deg', animationClass: 'animate-doodle-bob-gentle', delay: '1.4s', opacity: 'opacity-85 dark:opacity-75 max-md:opacity-60' },
  ];

  // Cấu hình Landing mở rộng (thêm folder và chat lơ lửng quanh Hero)
  const landingPositions: DoodlePosition[] = [
    ...authPositions,
    { id: 'folder', Component: DoodleFolder, top: '18%', left: '22%', size: 'w-10 h-10 sm:w-14 sm:h-14', rotate: '-15deg', animationClass: 'animate-doodle-float-slow', delay: '2.5s', opacity: 'opacity-50 dark:opacity-40 hidden md:block' },
    { id: 'chat', Component: DoodleChat, top: '22%', right: '22%', size: 'w-10 h-10 sm:w-14 sm:h-14', rotate: '12deg', animationClass: 'animate-doodle-bob-gentle', delay: '1.9s', opacity: 'opacity-50 dark:opacity-40 hidden md:block' },
  ];

  const activePositions = variant === 'auth' ? authPositions : landingPositions;

  return (
    <aside
      aria-label="Decorative Background"
      aria-hidden="true"
      className={`fixed inset-0 overflow-hidden pointer-events-none select-none z-0 ${className}`}
    >
      {/* 1. Ambient Brand Glow Orbs */}
      {showGlowOrbs && (
        <>
          <div
            className="absolute -top-[15%] -left-[10%] w-[45vw] h-[45vw] rounded-full blur-[110px] pointer-events-none transition-opacity duration-1000"
            style={{
              background: 'radial-gradient(circle, rgba(242, 141, 141, 0.18) 0%, rgba(255, 192, 203, 0.08) 60%, transparent 80%)',
            }}
          />
          <div
            className="absolute -bottom-[15%] -right-[10%] w-[45vw] h-[45vw] rounded-full blur-[110px] pointer-events-none transition-opacity duration-1000"
            style={{
              background: 'radial-gradient(circle, rgba(135, 206, 235, 0.22) 0%, rgba(16, 185, 129, 0.06) 60%, transparent 80%)',
            }}
          />
          <div
            className="absolute top-[40%] right-[3%] w-[25vw] h-[25vw] rounded-full blur-[90px] pointer-events-none transition-opacity duration-1000"
            style={{
              background: 'radial-gradient(circle, rgba(254, 240, 138, 0.12) 0%, transparent 70%)',
            }}
          />
        </>
      )}

      {/* 2. Technical Grid Underlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 dark:opacity-20 pointer-events-none" />

      {/* 3. Doodle Icons Array with Micro-Interactions */}
      {activePositions.map(({ id, Component, top, bottom, left, right, size, rotate, animationClass, delay, opacity }) => (
        <div
          key={id}
          style={{
            top,
            bottom,
            left,
            right,
            animationDelay: delay,
            transform: `rotate(${rotate})`,
          }}
          className={`absolute ${animationClass} pointer-events-auto transition-transform duration-300 hover:scale-125 hover:rotate-6 cursor-pointer ${opacity}`}
          title="Planify Doodle"
        >
          <div className="filter drop-shadow-sm hover:drop-shadow-lg transition-all duration-300">
            <Component className={`${size}`} />
          </div>
        </div>
      ))}
    </aside>
  );
});

PlayfulBackground.displayName = 'PlayfulBackground';

