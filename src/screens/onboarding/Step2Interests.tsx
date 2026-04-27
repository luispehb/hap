import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { OnboardingLayout } from './OnboardingLayout'
import { Button } from '../../components/ui'
import { onboardingStore } from '../../lib/onboardingStore'

const INTEREST_CATEGORIES = [
  { id: 'gastronomy', name: 'Gastronomía', emoji: '☕',
    chips: ['comida', 'café de especialidad', 'mercados locales', 'vino y maridaje', 'cocina callejera', 'cocinar juntos', 'cenas con extraños'] },
  { id: 'art', name: 'Arte y cultura', emoji: '🎨',
    chips: ['arte', 'museos y galerías', 'arquitectura', 'fotografía', 'cine de autor', 'teatro y performance', 'arte callejero', 'diseño'] },
  { id: 'music', name: 'Música', emoji: '🎵',
    chips: ['música', 'conciertos en vivo', 'jazz y blues', 'electrónica y clubs', 'música clásica', 'tocar instrumentos'] },
  { id: 'movement', name: 'Movimiento y naturaleza', emoji: '🏃',
    chips: ['senderismo', 'running urbano', 'ciclismo', 'yoga y meditación', 'surf', 'escalada', 'natación', 'deportes de equipo'] },
  { id: 'mind', name: 'Mente y conversación', emoji: '📚',
    chips: ['libros y lectura', 'podcasts y audio', 'aprender idiomas', 'juegos de mesa', 'startups e ideas', 'política y sociedad'] },
  { id: 'urban', name: 'Exploración urbana', emoji: '🗺️',
    chips: ['barrios locales', 'tours a pie', 'historia y patrimonio', 'vida nocturna', 'mercados de pulgas', 'spots secretos', 'transporte local'] },
  { id: 'creation', name: 'Creación', emoji: '✏️',
    chips: ['escritura', 'podcasting', 'video y reels', 'ilustración', 'moda y estilo', 'jardinería urbana'] },
  { id: 'purpose', name: 'Trabajo y propósito', emoji: '💡',
    chips: ['tecnología', 'sostenibilidad', 'emprendimiento', 'educación', 'salud y bienestar', 'impacto social', 'arte y creatividad como trabajo'] },
  { id: 'adventure', name: 'Aventura y adrenalina', emoji: '🧗',
    chips: ['senderismo extremo', 'parapente', 'buceo', 'escalada en roca', 'via ferrata', 'kayak y rafting', 'bungee y saltos', 'motociclismo'] },
  { id: 'spirit', name: 'Espiritualidad e introspección', emoji: '🧘',
    chips: ['meditación', 'retiros de silencio', 'astrología', 'filosofías orientales', 'naturaleza como práctica', 'ceremonias y rituales'] },
  { id: 'volunteer', name: 'Voluntariado e impacto', emoji: '🤝',
    chips: ['voluntariado local', 'conservación ambiental', 'educación comunitaria', 'rescate animal', 'construcción social', 'banco de alimentos'] },
  { id: 'animals', name: 'Animales y naturaleza salvaje', emoji: '🦁',
    chips: ['observación de aves', 'safaris y vida salvaje', 'tener mascotas', 'rescate animal', 'buceo con fauna marina', 'fotografía de naturaleza'] },
  { id: 'science', name: 'Ciencia y curiosidad', emoji: '🔭',
    chips: ['astronomía', 'historia natural', 'museos de ciencia', 'divulgación científica', 'experimentos mentales', 'documentales', 'arqueología'] },
  { id: 'play', name: 'Juego y competencia', emoji: '♟️',
    chips: ['ajedrez', 'videojuegos', 'juegos de rol', 'trivia y quiz nights', 'deportes de fantasía', 'escape rooms', 'juegos de cartas'] },
  { id: 'wellness', name: 'Bienestar y cuerpo', emoji: '🌿',
    chips: ['spas y baños termales', 'ayuno intermitente', 'meditación y sauna', 'breathwork', 'masaje y bodywork', 'alimentación consciente'] },
  { id: 'lifestyle', name: 'Estilos de vida', emoji: '🌍',
    chips: ['minimalismo', 'vida sin alcohol', 'nomadismo digital', 'van life', 'zero waste', 'comunidades intencionales', 'slow travel'] },
]

export function Step2Interests() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>([])
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set([INTEREST_CATEGORIES[0].id])
  )

  function toggleCategory(id: string) {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleChip(chip: string) {
    setSelected(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    )
  }

  const count = selected.length
  const isReady = count >= 3

  return (
    <OnboardingLayout step={2}>
      <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-1">
        Paso 2 de 4
      </p>
      <h1 className="text-[26px] font-extrabold text-ink tracking-tight leading-tight mb-1">
        ¿Qué te mueve?
      </h1>
      <p className={`text-xs mb-5 ${isReady ? 'text-sky font-bold' : 'text-muted'}`}>
        {count} intereses seleccionados · elige al menos 3
      </p>

      <div className="flex flex-col gap-2">
        {INTEREST_CATEGORIES.map(cat => {
          const isOpen = openCategories.has(cat.id)
          const catCount = cat.chips.filter(c => selected.includes(c)).length
          return (
            <div key={cat.id} className="bg-white border border-[#E8E4DC] rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-4 py-3 cursor-pointer active:bg-sand transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{cat.emoji}</span>
                  <span className="text-sm font-bold text-ink">{cat.name}</span>
                  {catCount > 0 && (
                    <span className="bg-[#4A90D9] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {catCount}
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className={`text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 flex flex-wrap gap-2">
                  {cat.chips.map(chip => {
                    const isSelected = selected.includes(chip)
                    return (
                      <button
                        key={chip}
                        onClick={() => toggleChip(chip)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#4A90D9] text-white'
                            : 'bg-sand text-muted'
                        }`}
                      >
                        {chip}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-auto pt-6">
        <Button
          variant="primary"
          fullWidth
          disabled={!isReady}
          onClick={() => {
            onboardingStore.set({ interests: selected })
            navigate('/onboarding/3')
          }}
        >
          Continuar →
        </Button>
      </div>
    </OnboardingLayout>
  )
}
