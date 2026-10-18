import type { Config } from 'tailwindcss'

/**
 * Design tokens extraídos do mockup de referência (athoslife_v7_3.html).
 * A marca já existe: verde do mascote sobre superfícies escuras em camadas.
 * Nomes são semânticos (surface-1..4), não literais, para permitir
 * evolução visual sem caçar hex espalhado pelo código.
 */
const v = (nome: string) => `rgb(var(--c-${nome}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Cores em variáveis (ui/theme/globals.css): escuro ou claro conforme o
      // modo do celular. `<alpha-value>` mantém o bg-brand/10 etc. funcionando.
      colors: {
        brand: {
          DEFAULT: v('brand'),
          dark: v('brand-dark'),
          glow: v('brand-glow'),
          /** Texto/ícone em cima do verde da marca (botão primário). */
          ink: v('brand-ink'),
        },
        surface: {
          1: v('surface-1'), // fundo do app
          2: v('surface-2'), // cards
          3: v('surface-3'), // cards elevados
          4: v('surface-4'), // bordas / inputs
          nav: v('surface-nav'), // barra de baixo
        },
        content: {
          hi: v('content-hi'),
          mid: v('content-mid'),
          low: v('content-low'),
          dim: v('content-dim'),
        },
        accent: {
          energy: v('accent-energy'), // treino / calorias
          water: v('accent-water'), // hidratação
          gold: v('accent-gold'), // conquistas
          /**
           * Recaída é ROXO, nunca vermelho/rosa.
           * Não é decisão estética: vermelho é a cor de alarme e de erro,
           * e leria como punição. A regra de negócio diz que recaída
           * nunca pune. O roxo acolhe sem julgar — a cor obedece à regra.
           */
          recaida: v('accent-recaida'),
          recaidaSoft: v('accent-recaida-soft'),
          /** Só erro real e ação destrutiva. Nunca para recaída. */
          danger: v('accent-danger'),
          /** Coração de favorito (convenção de mercado). Não é erro. */
          favorito: v('accent-favorito'),
        },
        /**
         * Uma cor por macro, a mesma em todo o app (antes a proteína era
         * vermelha num lugar e azul no outro). Nenhuma é vermelho: macro não
         * é erro. Contraste ≥ 4,5:1 sobre o fundo nos dois modos (WCAG AA).
         */
        macro: {
          proteina: v('macro-proteina'),
          carbo: v('macro-carbo'),
          gordura: v('macro-gordura'),
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
