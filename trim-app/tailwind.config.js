/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pantone Cloud Dancer 11-4201 TCX - 따뜻한 오프화이트
        cloudDancer: '#F0EEE9',
        // Pantone Stretch Limo 19-4005 TCX - 거의 블랙에 가까운 진한 차콜
        stretchLimo: '#1A1A1A',
        // Pantone Micron 20-0007 TPM - 중간 차콜 회색
        micron: '#6B6B6B',
        // Pantone Scarlet Smile 19-1558 TCX - 밝은 레드
        scarletSmile: '#E63946',
        // 카드용 Cloud Dancer 변형 - Cloud Dancer보다 약간 밝지만 같은 따뜻한 톤
        cardBg: '#F5F3F0',
        // 추가 유틸리티 색상 (투명도 변형)
        stretchLimo50: 'rgba(26, 26, 26, 0.05)',
        stretchLimo100: 'rgba(26, 26, 26, 0.10)',
        stretchLimo200: 'rgba(26, 26, 26, 0.20)',
        stretchLimo300: 'rgba(26, 26, 26, 0.30)',
        stretchLimo400: 'rgba(26, 26, 26, 0.40)',
        stretchLimo500: 'rgba(26, 26, 26, 0.50)',
        stretchLimo600: 'rgba(26, 26, 26, 0.60)',
        stretchLimo700: 'rgba(26, 26, 26, 0.70)',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-0.5deg)' },
          '50%': { transform: 'rotate(0.5deg)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.3s ease-in-out infinite',
        slideUp: 'slideUp 0.3s ease-out',
        fadeIn: 'fadeIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
