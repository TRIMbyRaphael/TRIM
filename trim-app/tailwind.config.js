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
        cloudDancer: '#F7F5F0',
        // Pantone Stretch Limo 19-4005 TCX - 진한 차콜
        stretchLimo: '#2C2C2E',
        // Pantone Micron 20-0007 TPM - 거의 블랙에 가까운 차콜
        micron: '#1C1C1E',
        // Pantone Scarlet Smile 19-1558 TCX - 밝은 레드
        scarletSmile: '#E63946',
        // 추가 유틸리티 색상 (투명도 변형)
        stretchLimo50: 'rgba(44, 44, 46, 0.05)',
        stretchLimo100: 'rgba(44, 44, 46, 0.10)',
        stretchLimo200: 'rgba(44, 44, 46, 0.20)',
        stretchLimo300: 'rgba(44, 44, 46, 0.30)',
        stretchLimo400: 'rgba(44, 44, 46, 0.40)',
        stretchLimo500: 'rgba(44, 44, 46, 0.50)',
        stretchLimo600: 'rgba(44, 44, 46, 0.60)',
        stretchLimo700: 'rgba(44, 44, 46, 0.70)',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-0.5deg)' },
          '50%': { transform: 'rotate(0.5deg)' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
