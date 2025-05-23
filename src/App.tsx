import { useEffect, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { useGithubFileSync } from './hooks/useGithubFileSync';

/* ───────── Типы и константы ───────── */
type User = 'me' | 'partner';

interface Penalty {
  id: string;
  user: User;
  type: PenaltyType;
  date: string;          // ISO
}

type PenaltyType = 'trash' | 'dishes' | 'stove';

const PENALTY_TYPES: Record<PenaltyType, string> = {
  trash : '🗑️ Не выбросил(а) мусор',
  dishes: '🍽️ Не вымыл(а) посуду',
  stove : '🔥 Не прибрал(а) плиту',
};

const now = new Date();
const monthKey = `penalties-${now.getFullYear()}-${String(
  now.getMonth() + 1,
).padStart(2, '0')}`;

/* ───────── Главный компонент ───────── */
export default function App() {
  /* GitHub-конфиг */
  const [cfg, setCfg] = useState(() => ({
    owner: localStorage.getItem('gh_owner') ?? '',
    repo : localStorage.getItem('gh_repo') ?? '',
    token: localStorage.getItem('pat')     ?? '',
  }));
  const [settingsOpen, setSettingsOpen] = useState(false);

  /* Синхронизация */
  const { data: ghPenalties, setData, pushFile } = useGithubFileSync<Penalty[]>(
    monthKey,
    [],
    cfg,
  );

  /* Локальный стейт */
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  useEffect(() => setPenalties(ghPenalties), [ghPenalties]);

  /* Счёт */
  const totals = useMemo(
    () =>
      penalties.reduce(
        (acc, p) => {
          acc[p.user] += 1;
          return acc;
        },
        { me: 0, partner: 0 } as Record<User, number>,
      ),
    [penalties],
  );

  /* Мутации */
  const addPenalty = (user: User, type: PenaltyType) => {
    const next = [
      ...penalties,
      { id: uuid(), user, type, date: new Date().toISOString() },
    ];
    setPenalties(next);
    setData(next);
    pushFile(next);
  };

  const undoPenalty = (id: string) => {
    const next = penalties.filter((p) => p.id !== id);
    setPenalties(next);
    setData(next);
    pushFile(next);
  };

  const saveCfg = (next: typeof cfg) => {
    localStorage.setItem('gh_owner', next.owner);
    localStorage.setItem('gh_repo',  next.repo);
    localStorage.setItem('pat',      next.token);
    setCfg(next);
  };

  /* ───────── JSX ───────── */
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 flex flex-col items-center
                 bg-gradient-to-b from-violet-100 via-white to-orange-100
                 relative overflow-hidden select-none"
    >
      {/* ⚙️ Шестерёнка настроек */}
      <motion.button
        whileHover={{ rotate: 30 }}
        whileTap={{ scale: 0.8 }}
        className="absolute top-4 right-4 text-3xl"
        onClick={() => setSettingsOpen(true)}
        title="Настройки"
      >
        ⚙️
      </motion.button>

      {/* Прогресс месяца */}
      <MonthProgressBar />

      {/* Шкала перетягивания каната */}
      <TugOfWarBar me={totals.me} partner={totals.partner} />

      {/* Табло */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-6">
        <ScoreCard
          label="Ксюша"
          count={totals.me}
          isLeader={totals.me < totals.partner}
        />
        <ScoreCard
          label="Кирилл"
          count={totals.partner}
          isLeader={totals.partner < totals.me}
        />
      </div>

      {/* Кнопки добавления штрафов */}
      <section className="w-full max-w-md mb-8">
        {Object.entries(PENALTY_TYPES).map(([type, label], i) => (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="mb-4"
          >
            <h3 className="font-medium mb-2">{label}</h3>
            <div className="flex gap-3">
              <AddBtn onClick={() => addPenalty('me', type as PenaltyType)}>
                Ксюша
              </AddBtn>
              <AddBtn onClick={() => addPenalty('partner', type as PenaltyType)}>
                Кирилл
              </AddBtn>
            </div>
          </motion.div>
        ))}
      </section>

      {/* История */}
      <motion.section
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white/90 backdrop-blur shadow-lg rounded-2xl p-4"
      >
        <h2 className="text-lg font-semibold mb-3">📜 История штрафов</h2>
        {penalties.length === 0 ? (
          <p className="text-sm text-gray-500">Штрафов пока нет — мы молодцы! ✨</p>
        ) : (
          <ul className="space-y-2 max-h-60 overflow-auto pr-1">
            <AnimatePresence>
              {penalties
                .slice()
                .reverse()
                .map((p) => (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-between items-center text-sm bg-gray-50 rounded-xl p-2"
                  >
                    <span className="mr-2">
                      {new Date(p.date).toLocaleDateString()} •{' '}
                      {PENALTY_TYPES[p.type]} •{' '}
                      {p.user === 'me' ? 'Ксюша' : 'Кирилл'}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      className="text-xs underline"
                      onClick={() => undoPenalty(p.id)}
                    >
                      Отмена
                    </motion.button>
                  </motion.li>
                ))}
            </AnimatePresence>
          </ul>
        )}
      </motion.section>

      {/* Модалка настроек */}
      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal
            cfg={cfg}
            onSave={saveCfg}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Фоновые эмодзи-конфетти */}
      <FloatingEmojis />
    </motion.main>
  );
}

/* ───────── Компоненты ───────── */

/* 1. Шкала «Прогресс месяца» */
function MonthProgressBar() {
  const [percent, setPercent] = useState(calcPercent());

  /* обновляем раз в минуту */
  useEffect(() => {
    const id = setInterval(() => setPercent(calcPercent()), 60_000);
    return () => clearInterval(id);
  }, []);

  const daysLeft = Math.ceil((100 - percent) / 100 * daysInMonth(new Date()));

  return (
    <div className="w-full max-w-md mb-4">
      <div className="mb-1 text-sm text-center">
        До конца месяца осталось {daysLeft}{' '}
        {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <motion.div
          className="bg-green-400 h-full"
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
function calcPercent() {
  const d = new Date();
  const total = daysInMonth(d);
  return ((d.getDate() - 1 + d.getHours() / 24) / total) * 100;
}
function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/* Шкала-канат */
function TugOfWarBar({ me, partner }: { me: number; partner: number }) {
  const total = me + partner;
  const mePercent = total === 0 ? 50 : (me / total) * 100;

  return (
    <div className="w-full max-w-md mb-4 relative">
      {/* Трек */}
      <div className="h-2 bg-yellow-50 rounded-full overflow-hidden flex shadow-inner">
        <motion.div
          className="bg-indigo-300"
          initial={false}
          animate={{ width: `${mePercent}%` }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
        />
        <motion.div
          className="bg-pink-300 flex-1"
          initial={false}
          animate={{ width: `${100 - mePercent}%` }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
        />
      </div>

      {/* Узел каната */}
      <motion.span
        className="absolute -translate-y-1/4 text-3xl"
        style={{ top: '-120%' }}
        initial={false}
        animate={{ left: `${mePercent}%`, x: '-50%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 15 }}
      >
        🎁
      </motion.span>
    </div>
  );
}

/* Карточка счёта */
function ScoreCard({
  label,
  count,
  isLeader,
}: {
  label: string;
  count: number;
  isLeader: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`relative rounded-2xl p-4 shadow-md flex flex-col items-center ${
        isLeader ? 'bg-green-100 animate-pulse' : 'bg-white'
      }`}
    >
      {isLeader && (
        <motion.span
          key="trophy"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="absolute -top-4 text-3xl"
        >
          🏆
        </motion.span>
      )}

      <span className="text-base mb-1">{label}</span>
      <span className="text-3xl font-extrabold tracking-wide">{count}</span>
    </motion.div>
  );
}

/* Кнопка добавления штрафа */
function AddBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9, rotate: -4 }}
      className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm shadow"
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

/* Модальное окно настроек */
function SettingsModal({
  cfg,
  onSave,
  onClose,
}: {
  cfg: { owner: string; repo: string; token: string };
  onSave: (c: { owner: string; repo: string; token: string }) => void;
  onClose: () => void;
}) {
  const [owner, setOwner] = useState(cfg.owner);
  const [repo, setRepo] = useState(cfg.repo);
  const [token, setToken] = useState(cfg.token);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
        className="bg-white p-5 rounded-2xl w-80 shadow-lg"
      >
        <h2 className="text-lg font-bold mb-4">🛠️ GitHub синхронизация</h2>

        <label className="block text-sm mb-1">Owner</label>
        <input
          className="border rounded w-full p-1 mb-2"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />

        <label className="block text-sm mb-1">Repo</label>
        <input
          className="border rounded w-full p-1 mb-2"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
        />

        <label className="block text-sm mb-1">Token</label>
        <input
          type="password"
          className="border rounded w-full p-1 mb-4"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            className="flex-1 bg-gray-200 rounded py-1"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="flex-1 bg-indigo-600 text-white rounded py-1"
            onClick={() => {
              onSave({ owner, repo, token });
              onClose();
            }}
          >
            Сохранить
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Токен хранится только в LocalStorage этого браузера
        </p>
      </motion.div>
    </motion.div>
  );
}

/* Плавающие эмодзи-конфетти */
function FloatingEmojis() {
  const emojis = ['🎈', '✨', '💫', '🎉', '🍀', '⭐'];
  return (
    <>
      {emojis.map((e, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl pointer-events-none"
          style={{
            left: `${Math.random() * 100}%`,
            top: '100%',
          }}
          animate={{ y: '-120vh', opacity: [0, 1, 0] }}
          transition={{
            duration: 12 + Math.random() * 6,
            delay: Math.random() * 4,
            repeat: Infinity,
          }}
        >
          {e}
        </motion.span>
      ))}
    </>
  );
}