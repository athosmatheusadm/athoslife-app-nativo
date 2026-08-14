import type { Config } from 'tailwindcss'

/**
 * Design tokens extraídos do mockup de referência (athoslife_v7_3.html).
 * A marca já existe: verde do mascote sobre superfícies escuras em camadas.
 * Nomes são semânticos (surface-1..4), não literais, para permitir
 * evolução visual sem caçar hex espalhado pelo código.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#22c55e',
          dark: '#16a34a',
          glow: '#0f1f0f',
        },
        surface: {
          1: '#161616', // fundo do app
          2: '#1a1a1a', // cards
          3: '#1f1f1f', // cards elevados
          4: '#2a2a2a', // bordas / inputs
        },
        content: {
          hi: '#ffffff',
          mid: '#d1d5db',
          low: '#9ca3af',
          dim: '#6b7280',
        },
        accent: {
          energy: '#f97316', // treino / calorias
          water: '#3b82f6', // hidratação
          gold: '#fbbf24', // conquistas
          /**
           * Recaída é ROXO, nunca vermelho/rosa.
           * Não é decisão estética: vermelho é a cor de alarme e de erro,
           * e leria como punição. A regra de negócio diz que recaída
           * nunca pune. O roxo acolhe sem julgar — a cor obedece à regra.
           */
          recaida: '#8b5cf6',
          recaidaSoft: '#a78bfa',
          /** Só erro real e ação destrutiva. Nunca para recaída. */
          danger: '#f43f5e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Piso de acessibilidade: nada abaixo de 12px.
        // O mockup usava 8-9px — regressão corrigida de propósito.
        micro: ['0.75rem', { lineHeight: '1rem' }],
      },
      borderRadius: { card: '1rem', pill: '9999px' },
      spacing: {
        // Área segura do Android (notch / barra de gestos).
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
      },
      transitionTimingFunction: {
        athos: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
