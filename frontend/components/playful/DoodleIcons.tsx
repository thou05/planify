import React from 'react';

export interface DoodleIconProps {
  className?: string;
}

export type DoodleIconComponent = React.FC<DoodleIconProps>;

/**
 * 1. 🚀 Sprint Rocket (Tên lửa bứt tốc)
 */
export const DoodleRocket: DoodleIconComponent = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Đuôi lửa & Khói */}
    <path d="M22 46C18 50 14 56 16 58C18 60 24 56 28 52" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M19 49C16 52 14 56 16 57C18 58 22 56 25 53" fill="#fef08a" />
    {/* Sao lấp lánh */}
    <path d="M10 38L11 41L14 42L11 43L10 46L9 43L6 42L9 41L10 38Z" fill="#ffc0cb" />
    <path d="M46 12L47 14L49 15L47 16L46 18L45 16L43 15L45 14L46 12Z" fill="#87ceeb" />
    <circle cx="12" cy="52" r="1.5" fill="#f28d8d" />
    {/* Vây cánh 2 bên */}
    <path d="M26 38L18 42C16 43 15 45 16 47L21 48L28 43" fill="#87ceeb" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M38 26L42 18C43 16 45 15 47 16L48 21L43 28" fill="#87ceeb" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Thân tên lửa */}
    <path d="M25 39C20 31 24 18 46 14C50 36 37 40 25 39Z" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Mũi tên lửa */}
    <path d="M39 16C42 14.5 45 14 46 14C46 15 45.5 18 44 21C42 20 40 18 39 16Z" fill="#f28d8d" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Cửa sổ phi hành gia */}
    <circle cx="34" cy="26" r="4.5" fill="#87ceeb" stroke="#0f172a" strokeWidth="2.2" />
    <circle cx="33" cy="25" r="1.5" fill="#ffffff" />
    {/* Vệt tốc độ */}
    <path d="M48 28C53 30 55 33 54 36" stroke="#f28d8d" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 3" />
  </svg>
);

/**
 * 2. 📋 Kanban Board (Bảng 3 cột rực rỡ)
 */
export const DoodleKanban: DoodleIconComponent = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Khung bảng ngoài */}
    <rect x="8" y="10" width="48" height="44" rx="8" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
    {/* Đường phân chia cột */}
    <line x1="24" y1="18" x2="24" y2="48" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="2 3" />
    <line x1="40" y1="18" x2="40" y2="48" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="2 3" />
    {/* Header Dots */}
    <circle cx="16" cy="15" r="1.5" fill="#f28d8d" />
    <circle cx="32" cy="15" r="1.5" fill="#87ceeb" />
    <circle cx="48" cy="15" r="1.5" fill="#10b981" />
    {/* Cột 1: To Do Cards */}
    <rect x="11" y="20" width="10" height="12" rx="3" fill="#fff0f3" stroke="#f28d8d" strokeWidth="1.8" />
    <line x1="13" y1="24" x2="18" y2="24" stroke="#f28d8d" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="11" y="35" width="10" height="8" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
    {/* Cột 2: In-Progress Card (Hơi xoay nghiêng tạo cảm giác kéo thả) */}
    <g transform="rotate(-6 32 26)">
      <rect x="27" y="21" width="10" height="14" rx="3" fill="#f0f9ff" stroke="#87ceeb" strokeWidth="2" />
      <line x1="29" y1="25" x2="35" y2="25" stroke="#87ceeb" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="34" cy="31" r="1.2" fill="#87ceeb" />
    </g>
    {/* Cột 3: Done Card */}
    <rect x="43" y="20" width="10" height="16" rx="3" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.8" />
    <path d="M46 27L48 29L51 25" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 3. 📌 Sticky Note & Pin (Ghi chú mặt cười dán ghim)
 */
export const DoodleStickyNote: DoodleIconComponent = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="rotate(7 32 32)">
      {/* Thân giấy note */}
      <path d="M12 14C12 11.7909 13.7909 10 16 10H46C48.2091 10 50 11.7909 50 14V40L38 52H16C13.7909 52 12 50.2091 12 48V14Z" fill="#fef9c3" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Góc gấp mép 3D */}
      <path d="M38 40H48L38 52V42C38 40.8954 37.1046 40 36 40Z" fill="#fef08a" stroke="#0f172a" strokeWidth="2.2" strokeLinejoin="round" />
      {/* Mặt cười Doodle */}
      <circle cx="24" cy="24" r="2" fill="#0f172a" />
      <circle cx="36" cy="24" r="2" fill="#0f172a" />
      <path d="M25 30C27 33 33 33 35 30" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      {/* Dòng chữ viết tay doodle */}
      <line x1="20" y1="38" x2="34" y2="38" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 3" />
    </g>
    {/* Ghim đỏ San hô */}
    <circle cx="32" cy="11" r="4.5" fill="#f28d8d" stroke="#0f172a" strokeWidth="2.2" />
    <path d="M32 15.5V19" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
    <circle cx="31" cy="9.5" r="1.2" fill="#ffffff" />
  </svg>
);

/**
 * 4. ✅ Checklist & Sparkle (Nhiệm vụ hoàn thành lấp lánh)
 */
export const DoodleChecklist: DoodleIconComponent = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Bảng checklist */}
    <rect x="14" y="12" width="36" height="44" rx="6" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
    {/* Tai kẹp kim loại */}
    <path d="M26 12V9C26 7.89543 26.8954 7 28 7H36C37.1046 7 38 7.89543 38 9V12" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2" />
    <circle cx="32" cy="10" r="1.5" fill="#f28d8d" />
    {/* Hàng 1: Tick Done */}
    <rect x="18" y="20" width="8" height="8" rx="2" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.8" />
    <path d="M20 24L22.5 26.5L25 21.5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="29" y1="24" x2="43" y2="24" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
    {/* Hàng 2: Tick Done */}
    <rect x="18" y="31" width="8" height="8" rx="2" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.8" />
    <path d="M20 35L22.5 37.5L25 32.5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="29" y1="35" x2="41" y2="35" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
    {/* Hàng 3: Đang làm dở */}
    <rect x="18" y="42" width="8" height="8" rx="2" fill="#fff" stroke="#f28d8d" strokeWidth="1.8" />
    <line x1="29" y1="46" x2="38" y2="46" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
    {/* Ngôi sao lấp lánh Sparkles */}
    <path d="M50 14L51.5 18.5L56 20L51.5 21.5L50 26L48.5 21.5L44 20L48.5 18.5L50 14Z" fill="#ffc0cb" />
    <path d="M10 44L11 47L14 48L11 49L10 52L9 49L6 48L9 47L10 44Z" fill="#f59e0b" />
  </svg>
);

/**
 * 5. ☕ Coffee Cup (Ly cà phê latte art năng lượng)
 */
export const DoodleCoffee: DoodleIconComponent = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Đĩa lót ly */}
    <ellipse cx="32" cy="53" rx="20" ry="3.5" fill="#f1f5f9" stroke="#0f172a" strokeWidth="2.5" />
    {/* Quai cầm tách */}
    <path d="M43 32C49 32 52 36 50 42C48 46 43 47 41 47" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* Thân ly cà phê */}
    <path d="M17 28H47C47 28 46 49 32 49C18 49 17 28 17 28Z" fill="#87ceeb" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Miệng ly & Lớp cà phê */}
    <ellipse cx="32" cy="28" rx="15" ry="4" fill="#78350f" stroke="#0f172a" strokeWidth="2.2" />
    {/* Trái tim Latte Art */}
    <path d="M32 28.5C30.5 26.5 28 27.5 28.5 29C29 30.5 32 32 32 32C32 32 35 30.5 35.5 29C36 27.5 33.5 26.5 32 28.5Z" fill="#ffedd5" />
    {/* Khói bốc lên hình lượn sóng */}
    <path d="M26 21C25 18 27 16 26 13" stroke="#f28d8d" strokeWidth="2" strokeLinecap="round" />
    <path d="M32 20C31 16 33 14 32 10" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M38 21C37 18 39 16 38 13" stroke="#87ceeb" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * 6. 💡 Idea Bulb (Bóng đèn ý tưởng sáng tạo)
 */
export const DoodleIdeaBulb: DoodleIconComponent = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Tia phát sáng xung quanh */}
    <line x1="32" y1="7" x2="32" y2="12" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="14" y1="18" x2="18" y2="21" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="50" y1="18" x2="46" y2="21" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="10" y1="32" x2="15" y2="32" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="54" y1="32" x2="49" y2="32" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
    {/* Thân bóng đèn thủy tinh */}
    <path d="M22 36C18 32 17 24 21 18C25 12 39 12 43 18C47 24 46 32 42 36C40 38 39 41 39 44H25C25 41 24 38 22 36Z" fill="#fef08a" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Mặt cười híp mắt trên bóng đèn */}
    <path d="M27 25C28 23 30 23 31 25" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
    <path d="M37 25C38 23 40 23 41 25" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
    <path d="M32 28C33 30 35 30 36 28" stroke="#f28d8d" strokeWidth="2" strokeLinecap="round" />
    <circle cx="26" cy="27" r="1.5" fill="#ffc0cb" />
    <circle cx="42" cy="27" r="1.5" fill="#ffc0cb" />
    {/* Đui đèn & Cuộn kim loại */}
    <path d="M26 44H38V48H26V44Z" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
    <path d="M28 48H36V51H28V48Z" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
    <path d="M30 51H34V53C34 54.1046 33.1046 55 32 55C30.8954 55 30 54.1046 30 53V51Z" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.8" />
  </svg>
);

/**
 * 7. ⏰ Cute Clock / Pomodoro (Đồng hồ deadline ngộ nghĩnh)
 */
export const DoodleClock: DoodleIconComponent = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Hai tai chuông báo thức */}
    <path d="M16 19C13 16 14 11 18 10C22 9 24 13 23 16" fill="#f28d8d" stroke="#0f172a" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M48 19C51 16 50 11 46 10C42 9 40 13 41 16" fill="#f28d8d" stroke="#0f172a" strokeWidth="2.2" strokeLinejoin="round" />
    {/* Nút bấm trên đỉnh */}
    <path d="M30 13H34V16H30V13Z" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2" />
    {/* Hai chân chống nghiêng */}
    <line x1="20" y1="51" x2="16" y2="56" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="44" y1="51" x2="48" y2="56" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
    {/* Thân đồng hồ chính */}
    <circle cx="32" cy="35" r="18" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
    {/* Viền phụ bên trong */}
    <circle cx="32" cy="35" r="15" fill="#fff0f3" />
    {/* Các vạch giờ chính (12, 3, 6, 9) */}
    <circle cx="32" cy="23" r="1.2" fill="#0f172a" />
    <circle cx="44" cy="35" r="1.2" fill="#0f172a" />
    <circle cx="32" cy="47" r="1.2" fill="#0f172a" />
    <circle cx="20" cy="35" r="1.2" fill="#0f172a" />
    {/* Kim đồng hồ 10:10 vui vẻ */}
    <line x1="32" y1="35" x2="26" y2="28" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="32" y1="35" x2="40" y2="30" stroke="#f28d8d" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="32" cy="35" r="2.2" fill="#0f172a" />
    {/* Tia rung rung chuông reng reng */}
    <path d="M10 13C8 16 8 19 10 22" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    <path d="M54 13C56 16 56 19 54 22" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * 8. 🎯 Target & Dart (Hồng tâm Sprint phi tiêu 100%)
 */
export const DoodleTarget: DoodleIconComponent = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Vòng tròn 1: Ngoài cùng */}
    <circle cx="28" cy="36" r="20" fill="#f0f9ff" stroke="#0f172a" strokeWidth="2.5" />
    {/* Vòng tròn 2: Giữa */}
    <circle cx="28" cy="36" r="14" fill="#ffc0cb" stroke="#0f172a" strokeWidth="2.2" />
    {/* Vòng tròn 3: Tâm bia Bullseye */}
    <circle cx="28" cy="36" r="7" fill="#f28d8d" stroke="#0f172a" strokeWidth="2" />
    <circle cx="28" cy="36" r="2.5" fill="#f59e0b" />
    {/* Mũi phi tiêu cắm chéo từ góc phải trên */}
    <g transform="rotate(-15 28 36)">
      {/* Thân phi tiêu */}
      <line x1="28" y1="36" x2="48" y2="16" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      {/* Đuôi lông vũ phi tiêu */}
      <path d="M48 16L54 13L51 19L55 23L49 22L45 26L45 20L41 19L48 16Z" fill="#10b981" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
    </g>
    {/* Ngôi sao lấp lánh khi bắn trúng tâm */}
    <path d="M12 22L13 24.5L16 25L13 25.5L12 28L11 25.5L8 25L11 24.5L12 22Z" fill="#f59e0b" />
    <path d="M38 52L39 54L41 54.5L39 55L38 57L37 55L35 54.5L37 54L38 52Z" fill="#87ceeb" />
  </svg>
);

/**
 * 9. 💬 Team Chat & High-Five (Bong bóng hội thoại cộng tác)
 */
export const DoodleChat: DoodleIconComponent = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Bong bóng thoại phía sau (Xanh Sky Blue) */}
    <path d="M14 20C14 15.5817 17.5817 12 22 12H38C42.4183 12 46 15.5817 46 20V28C46 32.4183 42.4183 36 38 36H24L16 41V34C14.8 32.5 14 30.5 14 28V20Z" fill="#87ceeb" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
    {/* 3 chấm gõ tin nhắn Typing */}
    <circle cx="24" cy="24" r="2" fill="#ffffff" />
    <circle cx="30" cy="24" r="2" fill="#ffffff" />
    <circle cx="36" cy="24" r="2" fill="#ffffff" />
    {/* Bong bóng thoại phía trước (Hồng San Hô) */}
    <path d="M26 30C26 26.6863 28.6863 24 32 24H48C51.3137 24 54 26.6863 54 30V38C54 41.3137 51.3137 44 48 44H44L38 49V43.5C36.8 42.5 26 41 26 38V30Z" fill="#fff0f3" stroke="#f28d8d" strokeWidth="2.2" strokeLinejoin="round" />
    {/* Icon Trái tim yêu thích trong chat */}
    <path d="M40 33C38.8 31.5 36.5 32 37 33.5C37.5 35 40 36.5 40 36.5C40 36.5 42.5 35 43 33.5C43.5 32 41.2 31.5 40 33Z" fill="#f28d8d" />
  </svg>
);

/**
 * 10. 🤖 Friendly AI Robot / Mascot (Robot trợ lý Planify)
 */
export const DoodleMascot: DoodleIconComponent = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Ăng-ten phát sóng */}
    <circle cx="32" cy="11" r="3" fill="#f59e0b" stroke="#0f172a" strokeWidth="2" />
    <line x1="32" y1="14" x2="32" y2="20" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M26 8C29 6 35 6 38 8" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
    {/* Đôi tai robot */}
    <rect x="8" y="30" width="5" height="10" rx="2.5" fill="#f28d8d" stroke="#0f172a" strokeWidth="2" />
    <rect x="51" y="30" width="5" height="10" rx="2.5" fill="#f28d8d" stroke="#0f172a" strokeWidth="2" />
    {/* Thân đầu robot */}
    <rect x="12" y="20" width="40" height="32" rx="10" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
    {/* Màn hình hiển thị gương mặt */}
    <rect x="17" y="25" width="30" height="20" rx="6" fill="#0f172a" />
    {/* Mắt LED cười híp (Hồng/Xanh Neon) */}
    <path d="M22 33C23 31 25 31 26 33" stroke="#87ceeb" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M38 33C39 31 41 31 42 33" stroke="#87ceeb" strokeWidth="2.2" strokeLinecap="round" />
    {/* Miệng cười nhe răng thân thiện */}
    <path d="M29 38C31 40 33 40 35 38" stroke="#ffc0cb" strokeWidth="2" strokeLinecap="round" />
    {/* Đốm má hồng */}
    <circle cx="23" cy="40" r="1.5" fill="#f28d8d" />
    <circle cx="41" cy="40" r="1.5" fill="#f28d8d" />
    {/* Cổ robot */}
    <path d="M28 52H36V55H28V52Z" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2" />
  </svg>
);

/**
 * 11. 📂 Project Folder (Thư mục tài liệu bung tỏa)
 */
export const DoodleFolder: DoodleIconComponent = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Tấm bìa lưng folder */}
    <path d="M10 18C10 15.7909 11.7909 14 14 14H24L28 18H50C52.2091 18 54 19.7909 54 22V46C54 48.2091 52.2091 50 50 50H14C11.7909 50 10 48.2091 10 46V18Z" fill="#fef08a" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Giấy tài liệu thò ra bên trong */}
    <rect x="18" y="20" width="28" height="24" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.8" />
    <line x1="22" y1="26" x2="36" y2="26" stroke="#87ceeb" strokeWidth="2" strokeLinecap="round" />
    <line x1="22" y1="31" x2="40" y2="31" stroke="#f28d8d" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="22" y1="36" x2="30" y2="36" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
    {/* Nắp folder phía trước mở nghiêng */}
    <path d="M8 28H56L50 50H14L8 28Z" fill="#fde047" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Sticker trái tim / ngôi sao dán trang trí trên bìa */}
    <circle cx="32" cy="40" r="4" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
    <path d="M32 38L32.8 39.8L34.5 40L33.2 41.2L33.5 43L32 42.1L30.5 43L30.8 41.2L29.5 40L31.2 39.8L32 38Z" fill="#f28d8d" />
  </svg>
);

/**
 * 12. 🏆 Trophy & Celebration (Cúp vô địch vinh danh)
 */
export const DoodleTrophy: DoodleIconComponent = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Hai quai cúp */}
    <path d="M19 23C13 23 11 29 14 34C17 38 21 37 23 35" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M45 23C51 23 53 29 50 34C47 38 43 37 41 35" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* Thân chén cúp chính */}
    <path d="M21 16H43V28C43 35 37 40 32 40C27 40 21 35 21 28V16Z" fill="#fef08a" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Ngôi sao số 1 nổi giữa cúp */}
    <path d="M32 22L33.5 25.5L37 26L34.5 28.5L35 32L32 30L29 32L29.5 28.5L27 26L30.5 25.5L32 22Z" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.2" strokeLinejoin="round" />
    {/* Cột nối & Chân đế cúp */}
    <path d="M29 40H35V45H29V40Z" fill="#fde047" stroke="#0f172a" strokeWidth="2" />
    <path d="M23 45H41L43 53H21L23 45Z" fill="#0f172a" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
    <rect x="25" y="47" width="14" height="3" rx="1" fill="#f28d8d" />
    {/* Pháo giấy Confetti lấp lánh */}
    <circle cx="14" cy="14" r="1.5" fill="#f28d8d" />
    <circle cx="50" cy="12" r="1.5" fill="#87ceeb" />
    <rect x="11" y="27" width="3" height="3" rx="0.8" fill="#10b981" transform="rotate(25 11 27)" />
    <rect x="52" y="26" width="3" height="3" rx="0.8" fill="#ffc0cb" transform="rotate(-30 52 26)" />
    <path d="M32 7L33 9.5L35.5 10L33.5 10.5L32 13L30.5 10.5L28.5 10L30.5 9.5L32 7Z" fill="#f59e0b" />
  </svg>
);

