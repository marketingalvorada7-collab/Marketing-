import React, { useState, useEffect, useMemo } from "react";
import { db } from "./firebase.js";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  arrayUnion,
} from "firebase/firestore";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Trash2,
  ArrowRightCircle,
  Repeat,
  Settings2,
  X,
  Search,
  CalendarDays,
  History,
  CheckCircle2,
  ListChecks,
  MessageSquare,
  Copy,
  CheckCheck,
  Download,
  Upload,
  ChevronUp,
  ChevronDown,
  WifiOff,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Tokens & constantes                                                     */
/* ---------------------------------------------------------------------- */

const RED = "#d32f2f";
const RED_DARK = "#a02323";
const BG = "#f7f5f2";
const CARD = "#ffffff";
const INK = "#2b2b2b";
const MUTED = "#7a746b";
const DIVIDER = "#e6e1d8";

const DEMANDA_BG = "#fff3e0";
const DEMANDA_BORDER = "#ffb74d";
const PROJETO_BG = "#e8f5e9";
const PROJETO_BORDER = "#81c784";

const PEOPLE = [
  { nome: "Elyza", cor: "#ef5350" },
  { nome: "Karla", cor: "#42a5f5" },
  { nome: "Camilla", cor: "#ab47bc" },
  { nome: "Vinicius", cor: "#26a69a" },
  { nome: "Marcos", cor: "#8d6e63" },
];
const PEOPLE_MAP = Object.fromEntries(PEOPLE.map((p) => [p.nome, p.cor]));

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const PATTERN_LABELS = {
  diaFixoMes: "Dia fixo do mês",
  diaFixoSemana: "Dia fixo da semana",
  todoDia: "Todo dia",
  periodoMes: "Período do mês",
  ultimosNDias: "Últimos N dias do mês",
  semanaDoMes: "Semana do mês (1ª-4ª)",
};

const DEFAULT_RULES = [
  { id: "r1", titulo: "Relatório do assessment sai", tipo: "demanda", responsaveis: ["Camilla"], pattern: { type: "diaFixoMes", dia: 15 } },
  { id: "r2", titulo: "Tirar boleto meta/gerenciador", tipo: "demanda", responsaveis: ["Elyza"], pattern: { type: "ultimosNDias", n: 7 } },
  { id: "r3", titulo: "Converter clientes My Honda", tipo: "demanda", responsaveis: ["Elyza", "Karla", "Camilla"], pattern: { type: "ultimosNDias", n: 7 } },
  { id: "r4", titulo: "Perder leads My Honda", tipo: "demanda", responsaveis: ["Elyza", "Karla", "Camilla"], pattern: { type: "ultimosNDias", n: 7 } },
  { id: "r5", titulo: "Programar campanhas do Meta", tipo: "demanda", responsaveis: ["Camilla"], pattern: { type: "ultimosNDias", n: 5 } },
  { id: "r6", titulo: "Aniversariantes", tipo: "demanda", responsaveis: ["Karla"], pattern: { type: "ultimosNDias", n: 7 } },
  { id: "r7", titulo: "Programar campanhas do mês", tipo: "demanda", responsaveis: ["Camilla"], pattern: { type: "periodoMes", inicio: 8, fim: 14 } },
  { id: "r8", titulo: "Trocar artes sazonais", tipo: "demanda", responsaveis: ["Karla", "Marcos"], pattern: { type: "diaFixoMes", dia: 1 } },
  { id: "r9", titulo: "Boletos de impulsionamentos", tipo: "demanda", responsaveis: ["Elyza"], pattern: { type: "periodoMes", inicio: 1, fim: 10 } },
  { id: "r10", titulo: "Postar bom dia no story", tipo: "projeto", responsaveis: ["Vinicius", "Marcos"], pattern: { type: "todoDia" } },
  { id: "r11", titulo: "Vídeo de CNH no story", tipo: "projeto", responsaveis: ["Vinicius", "Marcos"], pattern: { type: "todoDia" } },
  { id: "r12", titulo: "Escala de CNH", tipo: "projeto", responsaveis: ["Vinicius"], pattern: { type: "diaFixoSemana", diaSemana: 6 } },
];

/* ---------------------------------------------------------------------- */
/* Utilidades de data                                                      */
/* ---------------------------------------------------------------------- */

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function startOfWeek(date) {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function getWeekDates(anchorDate) {
  const start = startOfWeek(anchorDate);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
function formatDay(date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
function formatRangeLabel(weekDates) {
  const first = weekDates[0];
  const last = weekDates[6];
  const sameMonth = first.getMonth() === last.getMonth();
  const fmt = (d, withMonth) =>
    withMonth
      ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
      : d.toLocaleDateString("pt-BR", { day: "2-digit" });
  return `${fmt(first, !sameMonth)} – ${fmt(last, true)} de ${last.toLocaleDateString("pt-BR", { year: "numeric" })}`;
}
function shouldGenerate(rule, date) {
  const day = date.getDate();
  const dow = date.getDay();
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const p = rule.pattern;
  switch (p.type) {
    case "diaFixoMes": return day === p.dia;
    case "diaFixoSemana": return dow === p.diaSemana;
    case "todoDia": return true;
    case "periodoMes": return day >= p.inicio && day <= p.fim;
    case "ultimosNDias": return day > lastDay - p.n;
    case "semanaDoMes": return Math.min(4, Math.ceil(day / 7)) === p.semana;
    default: return false;
  }
}
function nowIso() {
  return new Date().toISOString();
}
function uid(prefix = "t") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function nextOrderSeq() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}
function taskOrdem(t) {
  return typeof t.ordem === "number" ? t.ordem : new Date(t.criadoEm || 0).getTime();
}

/* ---------------------------------------------------------------------- */
/* Usuário atual (guardado no navegador, é um site de verdade agora)       */
/* ---------------------------------------------------------------------- */

function useLocalUser() {
  const [user, setUser] = useState(() => localStorage.getItem("agenda-usuario") || "");
  const update = (name) => {
    setUser(name);
    localStorage.setItem("agenda-usuario", name);
  };
  return [user, update];
}

/* ---------------------------------------------------------------------- */
/* Componentes pequenos                                                    */
/* ---------------------------------------------------------------------- */

function Avatar({ nome, size = 22 }) {
  const cor = PEOPLE_MAP[nome] || MUTED;
  return (
    <div
      title={nome}
      style={{
        width: size, height: size, borderRadius: "50%", background: cor, color: "#fff",
        fontSize: size * 0.45, fontWeight: 700, display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, border: "2px solid #fff",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      {(nome || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function AvatarStack({ pessoas }) {
  if (!pessoas || pessoas.length === 0) return null;
  return (
    <div style={{ display: "flex" }}>
      {pessoas.map((p, i) => (
        <div key={p} style={{ marginLeft: i === 0 ? 0 : -6 }}>
          <Avatar nome={p} />
        </div>
      ))}
    </div>
  );
}

function PersonMultiSelect({ value, onChange }) {
  const toggle = (nome) => {
    if (value.includes(nome)) onChange(value.filter((v) => v !== nome));
    else onChange([...value, nome]);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {PEOPLE.map((p) => {
        const active = value.includes(p.nome);
        return (
          <button
            type="button"
            key={p.nome}
            onClick={() => toggle(p.nome)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "5px 10px 5px 5px",
              borderRadius: 999, border: `1.5px solid ${active ? p.cor : DIVIDER}`,
              background: active ? `${p.cor}1a` : "#fff", cursor: "pointer", fontSize: 13,
              color: active ? p.cor : MUTED, fontWeight: active ? 700 : 500,
            }}
          >
            <Avatar nome={p.nome} size={18} />
            {p.nome}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Card de tarefa                                                          */
/* ---------------------------------------------------------------------- */

function TaskCard({ task, onToggle, onTomorrow, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const isDemanda = task.tipo === "demanda";
  const border = isDemanda ? DEMANDA_BORDER : PROJETO_BORDER;
  const bg = isDemanda ? DEMANDA_BG : PROJETO_BG;
  const done = task.status === "concluido";

  return (
    <div
      style={{
        background: done ? "#f1efe9" : bg, border: `1.5px solid ${done ? DIVIDER : border}`,
        borderRadius: 10, padding: "8px 10px", marginBottom: 8, opacity: done ? 0.65 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        {!done && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: -2, flexShrink: 0 }}>
            <button onClick={() => onMoveUp(task)} disabled={isFirst} title="Subir prioridade"
              style={{ border: "none", background: "transparent", cursor: isFirst ? "default" : "pointer", color: isFirst ? "#d8d3c8" : MUTED, display: "flex", padding: 0, lineHeight: 0 }}>
              <ChevronUp size={14} />
            </button>
            <button onClick={() => onMoveDown(task)} disabled={isLast} title="Descer prioridade"
              style={{ border: "none", background: "transparent", cursor: isLast ? "default" : "pointer", color: isLast ? "#d8d3c8" : MUTED, display: "flex", padding: 0, lineHeight: 0 }}>
              <ChevronDown size={14} />
            </button>
          </div>
        )}
        <button
          onClick={() => onToggle(task)}
          aria-label={done ? "Marcar como pendente" : "Marcar como concluída"}
          style={{
            marginTop: 1, width: 20, height: 20, borderRadius: 5,
            border: `2px solid ${done ? "#8bc98f" : border}`, background: done ? "#66bb6a" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
          }}
        >
          {done && <Check size={13} color="#fff" strokeWidth={3} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, textDecoration: done ? "line-through" : "none", lineHeight: 1.3, wordBreak: "break-word" }}>
            {task.titulo}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <AvatarStack pessoas={task.responsaveis} />
            <div style={{ display: "flex", gap: 4 }}>
              {task.recorrenciaId && (
                <span title="Tarefa recorrente" style={{ color: MUTED }}>
                  <Repeat size={13} />
                </span>
              )}
              {!done && (
                <button onClick={() => onTomorrow(task)} title="Passar para amanhã"
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: MUTED, display: "flex", alignItems: "center" }}>
                  <ArrowRightCircle size={15} />
                </button>
              )}
              <button onClick={() => onDelete(task)} title="Excluir"
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#c0392b", display: "flex", alignItems: "center" }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Modal genérico + estilos reutilizáveis                                  */
/* ---------------------------------------------------------------------- */

function Modal({ title, onClose, children, width = 440 }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(30,20,15,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: CARD, borderRadius: 14, width: "100%", maxWidth: width, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${DIVIDER}`, position: "sticky", top: 0, background: CARD, borderRadius: "14px 14px 0 0" }}>
          <h3 style={{ margin: 0, fontSize: 16, color: INK, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: MUTED, padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "9px 11px", borderRadius: 8, border: `1.5px solid ${DIVIDER}`, fontSize: 13.5, color: INK, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const labelStyle = { fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 0.3 };
const btnPrimary = { background: RED, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" };
const btnGhost = { background: "transparent", color: MUTED, border: `1.5px solid ${DIVIDER}`, borderRadius: 8, padding: "10px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" };

/* ---------------------------------------------------------------------- */
/* Modal: nova tarefa avulsa                                               */
/* ---------------------------------------------------------------------- */

function NewTaskModal({ defaultDate, onClose, onSave }) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("demanda");
  const [responsaveis, setResponsaveis] = useState([]);
  const [data, setData] = useState(toKey(defaultDate));
  const canSave = titulo.trim().length > 0;

  return (
    <Modal title="Nova tarefa avulsa" onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Título</label>
        <input style={inputStyle} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Enviar relatório para o cliente" autoFocus />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Data</label>
        <input type="date" style={inputStyle} value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Seção</label>
        <div style={{ display: "flex", gap: 8 }}>
          {["demanda", "projeto"].map((t) => (
            <button key={t} onClick={() => setTipo(t)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1.5px solid ${tipo === t ? (t === "demanda" ? DEMANDA_BORDER : PROJETO_BORDER) : DIVIDER}`, background: tipo === t ? (t === "demanda" ? DEMANDA_BG : PROJETO_BG) : "#fff", fontWeight: 700, fontSize: 13, color: INK, cursor: "pointer", textTransform: "capitalize" }}>
              {t === "demanda" ? "Demanda" : "Projeto"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Responsáveis</label>
        <PersonMultiSelect value={responsaveis} onChange={setResponsaveis} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button style={btnGhost} onClick={onClose}>Cancelar</button>
        <button style={{ ...btnPrimary, opacity: canSave ? 1 : 0.5 }} disabled={!canSave}
          onClick={() => canSave && onSave({ titulo: titulo.trim(), tipo, responsaveis, data })}>
          Adicionar
        </button>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------------- */
/* Modal: nova / editar recorrência                                        */
/* ---------------------------------------------------------------------- */

function RecurrenceModal({ initial, onClose, onSave }) {
  const [titulo, setTitulo] = useState(initial?.titulo || "");
  const [tipo, setTipo] = useState(initial?.tipo || "demanda");
  const [responsaveis, setResponsaveis] = useState(initial?.responsaveis || []);
  const [patternType, setPatternType] = useState(initial?.pattern?.type || "diaFixoMes");
  const [dia, setDia] = useState(initial?.pattern?.dia || 1);
  const [diaSemana, setDiaSemana] = useState(initial?.pattern?.diaSemana ?? 1);
  const [inicio, setInicio] = useState(initial?.pattern?.inicio || 1);
  const [fim, setFim] = useState(initial?.pattern?.fim || 5);
  const [n, setN] = useState(initial?.pattern?.n || 7);
  const [semana, setSemana] = useState(initial?.pattern?.semana || 1);
  const canSave = titulo.trim().length > 0;

  const buildPattern = () => {
    switch (patternType) {
      case "diaFixoMes": return { type: "diaFixoMes", dia: Number(dia) };
      case "diaFixoSemana": return { type: "diaFixoSemana", diaSemana: Number(diaSemana) };
      case "todoDia": return { type: "todoDia" };
      case "periodoMes": return { type: "periodoMes", inicio: Number(inicio), fim: Number(fim) };
      case "ultimosNDias": return { type: "ultimosNDias", n: Number(n) };
      case "semanaDoMes": return { type: "semanaDoMes", semana: Number(semana) };
      default: return { type: "todoDia" };
    }
  };

  const DOW_OPTIONS = [
    { label: "Segunda", value: 1 }, { label: "Terça", value: 2 }, { label: "Quarta", value: 3 },
    { label: "Quinta", value: 4 }, { label: "Sexta", value: 5 }, { label: "Sábado", value: 6 }, { label: "Domingo", value: 0 },
  ];

  return (
    <Modal title={initial ? "Editar recorrência" : "Nova recorrência"} onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Título</label>
        <input style={inputStyle} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Enviar relatório semanal" autoFocus />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Seção</label>
        <div style={{ display: "flex", gap: 8 }}>
          {["demanda", "projeto"].map((t) => (
            <button key={t} onClick={() => setTipo(t)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1.5px solid ${tipo === t ? (t === "demanda" ? DEMANDA_BORDER : PROJETO_BORDER) : DIVIDER}`, background: tipo === t ? (t === "demanda" ? DEMANDA_BG : PROJETO_BG) : "#fff", fontWeight: 700, fontSize: 13, color: INK, cursor: "pointer" }}>
              {t === "demanda" ? "Demanda" : "Projeto"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Responsáveis</label>
        <PersonMultiSelect value={responsaveis} onChange={setResponsaveis} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Padrão de recorrência</label>
        <select style={inputStyle} value={patternType} onChange={(e) => setPatternType(e.target.value)}>
          {Object.entries(PATTERN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {patternType === "diaFixoMes" && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Dia do mês (1–31)</label>
          <input type="number" min={1} max={31} style={inputStyle} value={dia} onChange={(e) => setDia(e.target.value)} />
        </div>
      )}
      {patternType === "diaFixoSemana" && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Dia da semana</label>
          <select style={inputStyle} value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>
            {DOW_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}
      {patternType === "periodoMes" && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Do dia</label>
            <input type="number" min={1} max={31} style={inputStyle} value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Ao dia</label>
            <input type="number" min={1} max={31} style={inputStyle} value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>
      )}
      {patternType === "ultimosNDias" && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Últimos quantos dias do mês?</label>
          <input type="number" min={1} max={30} style={inputStyle} value={n} onChange={(e) => setN(e.target.value)} />
        </div>
      )}
      {patternType === "semanaDoMes" && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Qual semana do mês?</label>
          <select style={inputStyle} value={semana} onChange={(e) => setSemana(e.target.value)}>
            <option value={1}>1ª semana (dias 1–7)</option>
            <option value={2}>2ª semana (dias 8–14)</option>
            <option value={3}>3ª semana (dias 15–21)</option>
            <option value={4}>4ª semana (dias 22 até o fim)</option>
          </select>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
        <button style={btnGhost} onClick={onClose}>Cancelar</button>
        <button style={{ ...btnPrimary, opacity: canSave ? 1 : 0.5 }} disabled={!canSave}
          onClick={() => canSave && onSave({ id: initial?.id || uid("r"), titulo: titulo.trim(), tipo, responsaveis, pattern: buildPattern() })}>
          Salvar
        </button>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------------- */
/* Painel: gerenciar recorrências                                          */
/* ---------------------------------------------------------------------- */

function ManageRecurrencesModal({ rules, onClose, onEdit, onDelete, onNew }) {
  const describe = (rule) => {
    const p = rule.pattern;
    switch (p.type) {
      case "diaFixoMes": return `Todo dia ${p.dia} do mês`;
      case "diaFixoSemana": return `Toda ${DIAS_SEMANA[p.diaSemana === 0 ? 6 : p.diaSemana - 1]}`;
      case "todoDia": return "Todo dia";
      case "periodoMes": return `Dias ${p.inicio}–${p.fim} do mês`;
      case "ultimosNDias": return `Últimos ${p.n} dias do mês`;
      case "semanaDoMes": return `${p.semana}ª semana do mês`;
      default: return "";
    }
  };

  return (
    <Modal title="Gerenciar recorrências" onClose={onClose} width={560}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button style={btnPrimary} onClick={onNew}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Plus size={14} /> Nova recorrência</span>
        </button>
      </div>
      {rules.length === 0 && <p style={{ color: MUTED, fontSize: 13.5 }}>Nenhuma recorrência cadastrada.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rules.map((r) => (
          <div key={r.id} style={{ border: `1.5px solid ${DIVIDER}`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: INK }}>
                {r.titulo}{" "}
                <span style={{ fontSize: 10.5, fontWeight: 700, color: r.tipo === "demanda" ? "#c77700" : "#2e7d32", background: r.tipo === "demanda" ? DEMANDA_BG : PROJETO_BG, padding: "2px 6px", borderRadius: 999, marginLeft: 6, textTransform: "uppercase" }}>
                  {r.tipo}
                </span>
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{describe(r)}</div>
              <div style={{ marginTop: 5 }}><AvatarStack pessoas={r.responsaveis} /></div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => onEdit(r)} style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}>Editar</button>
              <button onClick={() => onDelete(r)} style={{ ...btnGhost, padding: "6px 10px", fontSize: 12, color: "#c0392b", borderColor: "#eecfcb" }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------------- */
/* Modal: resumo por pessoa (texto pronto pra enviar)                      */
/* ---------------------------------------------------------------------- */

function SummaryModal({ tasks, weekDates, onClose }) {
  const todayKey = toKey(new Date());
  const [person, setPerson] = useState(PEOPLE[0].nome);
  const [dateKey, setDateKey] = useState(weekDates.some((d) => toKey(d) === todayKey) ? todayKey : toKey(weekDates[0]));
  const [copied, setCopied] = useState(false);

  const dateObj = new Date(dateKey + "T00:00:00");
  const dateLabel = dateObj.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const dayTasksForPerson = tasks.filter((t) => t.data === dateKey && t.status === "pendente" && t.responsaveis.includes(person));
  const demandas = dayTasksForPerson.filter((t) => t.tipo === "demanda");
  const projetos = dayTasksForPerson.filter((t) => t.tipo === "projeto");

  const buildText = () => {
    const linhas = [];
    linhas.push(`📋 Resumo do dia — ${person}`);
    linhas.push(dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1));
    linhas.push("");
    linhas.push(`🟠 Demandas (${demandas.length})`);
    if (demandas.length === 0) linhas.push("— nenhuma demanda pendente");
    else demandas.forEach((t) => {
      const outros = t.responsaveis.filter((r) => r !== person);
      linhas.push(`• ${t.titulo}${outros.length ? ` (com ${outros.join(", ")})` : ""}${t.recorrenciaId ? " [recorrente]" : " [avulsa]"}`);
    });
    linhas.push("");
    linhas.push(`🟢 Projetos (${projetos.length})`);
    if (projetos.length === 0) linhas.push("— nenhum projeto pendente");
    else projetos.forEach((t) => {
      const outros = t.responsaveis.filter((r) => r !== person);
      linhas.push(`• ${t.titulo}${outros.length ? ` (com ${outros.join(", ")})` : ""}${t.recorrenciaId ? " [recorrente]" : " [avulsa]"}`);
    });
    linhas.push("");
    linhas.push(`Total pendente: ${dayTasksForPerson.length}`);
    return linhas.join("\n");
  };

  const texto = buildText();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {}
  };

  return (
    <Modal title="Resumo por pessoa" onClose={onClose} width={480}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Pessoa</label>
          <select style={inputStyle} value={person} onChange={(e) => setPerson(e.target.value)}>
            {PEOPLE.map((p) => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Data</label>
          <input type="date" style={inputStyle} value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
        </div>
      </div>
      <label style={labelStyle}>Texto pronto para enviar</label>
      <textarea readOnly value={texto} style={{ ...inputStyle, minHeight: 220, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, whiteSpace: "pre-wrap" }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button style={btnGhost} onClick={onClose}>Fechar</button>
        <button style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6 }} onClick={handleCopy}>
          {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
          {copied ? "Copiado!" : "Copiar texto"}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------------- */
/* Modal: backup (exportar / importar JSON)                                */
/* ---------------------------------------------------------------------- */

function BackupModal({ tasks, rules, removed, auditLog, onClose, onRestore }) {
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [restoring, setRestoring] = useState(false);

  const handleExport = () => {
    const payload = { tasks, rules, removed, auditLog, exportadoEm: nowIso() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agenda-backup-${toKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.tasks)) throw new Error("formato inválido");
        setRestoring(true);
        await onRestore(parsed);
        setRestoring(false);
      } catch (err) {
        setRestoring(false);
        setError("Não consegui restaurar esse arquivo. Confirme que é um backup exportado por este app.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal title="Backup dos dados" onClose={onClose} width={440}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>Baixar backup agora</div>
        <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 10 }}>
          Com o Firestore os dados já ficam salvos de forma definitiva — este backup é só uma
          cópia extra de segurança, útil antes de mudanças grandes.
        </p>
        <button onClick={handleExport} style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6 }}>
          <Download size={14} /> Baixar backup (.json)
        </button>
      </div>
      <div style={{ borderTop: `1px solid ${DIVIDER}`, paddingTop: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>Restaurar de um backup</div>
        <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 10 }}>
          ⚠️ Isso substitui todos os dados atuais no banco de dados pelos do arquivo.
        </p>
        <label style={{ ...btnGhost, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <Upload size={14} /> {restoring ? "Restaurando…" : "Escolher arquivo…"}
          <input type="file" accept=".json" onChange={handleFile} style={{ display: "none" }} disabled={restoring} />
        </label>
        {fileName && !error && <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>Arquivo: {fileName}</div>}
        {error && <div style={{ fontSize: 12, color: "#c0392b", marginTop: 8 }}>{error}</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
        <button style={btnGhost} onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------------- */
/* App principal                                                           */
/* ---------------------------------------------------------------------- */

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [rules, setRules] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  const [anchorDate, setAnchorDate] = useState(new Date());
  const [tab, setTab] = useState("semana");
  const [currentUser, setCurrentUser] = useLocalUser();

  const [showNewTask, setShowNewTask] = useState(null);
  const [showNewRule, setShowNewRule] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [showManageRules, setShowManageRules] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const who = currentUser || "Visitante";

  /* ---------------------- listeners em tempo real (Firestore) ---------------------- */

  useEffect(() => {
    const unsubTasks = onSnapshot(
      collection(db, "tasks"),
      (snap) => {
        setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setReady(true);
        setOffline(false);
      },
      () => setOffline(true)
    );
    const unsubRemoved = onSnapshot(collection(db, "removedOccurrences"), (snap) => {
      setRemoved(snap.docs.map((d) => d.data()));
    });
    const unsubAudit = onSnapshot(collection(db, "auditLog"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.quando) - new Date(a.quando));
      setAuditLog(list.slice(0, 500));
    });
    const unsubRules = onSnapshot(collection(db, "rules"), async (snap) => {
      if (snap.empty) {
        // primeira vez rodando: semeia as recorrências padrão
        await Promise.all(DEFAULT_RULES.map((r) => setDoc(doc(db, "rules", r.id), r)));
        return;
      }
      setRules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubTasks();
      unsubRemoved();
      unsubAudit();
      unsubRules();
    };
  }, []);

  /* --------------------------- gerar recorrências ------------------------ */

  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);

  useEffect(() => {
    if (!ready || rules.length === 0) return;
    weekDates.forEach((date) => {
      const key = toKey(date);
      rules.forEach((rule) => {
        if (!shouldGenerate(rule, date)) return;
        const wasRemoved = removed.some((r) => r.ruleId === rule.id && r.data === key);
        if (wasRemoved) return;
        const exists = tasks.some((t) => t.recorrenciaId === rule.id && t.data === key);
        if (exists) return;
        addDoc(collection(db, "tasks"), {
          data: key,
          tipo: rule.tipo,
          titulo: rule.titulo,
          responsaveis: rule.responsaveis,
          status: "pendente",
          recorrenciaId: rule.id,
          ordem: nextOrderSeq(),
          criadoEm: nowIso(),
          ultimaAlteracao: nowIso(),
          historico: [{ acao: "criada (recorrência)", por: "Sistema", quando: nowIso() }],
        });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, weekDates, rules, removed, tasks]);

  /* ------------------------------ ações --------------------------------- */

  const pushAudit = (entry) => {
    addDoc(collection(db, "auditLog"), { ...entry, quando: nowIso(), por: who });
  };

  const handleToggle = (task) => {
    const novoStatus = task.status === "concluido" ? "pendente" : "concluido";
    updateDoc(doc(db, "tasks", task.id), {
      status: novoStatus,
      concluidoEm: novoStatus === "concluido" ? nowIso() : null,
      ultimaAlteracao: nowIso(),
      historico: arrayUnion({ acao: novoStatus === "concluido" ? "marcada como concluída" : "reaberta", por: who, quando: nowIso() }),
    });
    pushAudit({ taskId: task.id, titulo: task.titulo, acao: novoStatus === "concluido" ? "marcou como concluída" : "reabriu a tarefa" });
  };

  const handleTomorrow = async (task) => {
    const nextDate = toKey(addDays(new Date(task.data + "T00:00:00"), 1));
    if (task.recorrenciaId) {
      await addDoc(collection(db, "removedOccurrences"), { ruleId: task.recorrenciaId, data: task.data });
      await deleteDoc(doc(db, "tasks", task.id));
      await addDoc(collection(db, "tasks"), {
        data: nextDate, tipo: task.tipo, titulo: task.titulo, responsaveis: task.responsaveis,
        status: "pendente", ordem: nextOrderSeq(), criadoEm: nowIso(), ultimaAlteracao: nowIso(),
        historico: [{ acao: `passou para amanhã (${nextDate}) — desvinculada da recorrência`, por: who, quando: nowIso() }],
      });
    } else {
      await updateDoc(doc(db, "tasks", task.id), {
        data: nextDate, ultimaAlteracao: nowIso(),
        historico: arrayUnion({ acao: `passou para amanhã (${nextDate})`, por: who, quando: nowIso() }),
      });
    }
    pushAudit({ taskId: task.id, titulo: task.titulo, acao: "passou a tarefa para amanhã" });
  };

  const handleTomorrowAllDay = (dateKey) => {
    tasks.filter((t) => t.data === dateKey && t.status === "pendente").forEach((t) => handleTomorrow(t));
  };

  const moveTask = (task, direction) => {
    const group = tasks
      .filter((t) => t.data === task.data && t.tipo === task.tipo && t.status === "pendente")
      .sort((a, b) => taskOrdem(a) - taskOrdem(b));
    const idx = group.findIndex((t) => t.id === task.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= group.length) return;
    const a = group[idx], b = group[swapIdx];
    const aOrdem = taskOrdem(a), bOrdem = taskOrdem(b);
    updateDoc(doc(db, "tasks", a.id), { ordem: bOrdem });
    updateDoc(doc(db, "tasks", b.id), { ordem: aOrdem });
  };

  const handleDelete = (task) => {
    if (task.recorrenciaId) addDoc(collection(db, "removedOccurrences"), { ruleId: task.recorrenciaId, data: task.data });
    deleteDoc(doc(db, "tasks", task.id));
    pushAudit({ taskId: task.id, titulo: task.titulo, acao: "excluiu a tarefa" });
  };

  const handleAddTask = async (form) => {
    const ref = await addDoc(collection(db, "tasks"), {
      data: form.data, tipo: form.tipo, titulo: form.titulo, responsaveis: form.responsaveis,
      status: "pendente", ordem: nextOrderSeq(), criadoEm: nowIso(), ultimaAlteracao: nowIso(),
      historico: [{ acao: "criada", por: who, quando: nowIso() }],
    });
    pushAudit({ taskId: ref.id, titulo: form.titulo, acao: "criou a tarefa" });
    setShowNewTask(null);
  };

  const handleSaveRule = async (rule) => {
    await setDoc(doc(db, "rules", rule.id), rule);
    pushAudit({ taskId: rule.id, titulo: rule.titulo, acao: "salvou uma regra de recorrência" });
    setShowNewRule(false);
    setEditingRule(null);
  };

  const handleDeleteRule = async (rule) => {
    await deleteDoc(doc(db, "rules", rule.id));
    try {
      const q = query(collection(db, "tasks"), where("recorrenciaId", "==", rule.id), where("status", "==", "pendente"));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    } catch (e) {
      console.error("Erro ao limpar tarefas da recorrência excluída (pode precisar criar um índice no Firestore — veja o link no console do navegador):", e);
    }
    pushAudit({ taskId: rule.id, titulo: rule.titulo, acao: "excluiu uma regra de recorrência" });
  };

  const handleRestoreBackup = async (parsed) => {
    const existingTasks = await getDocs(collection(db, "tasks"));
    await Promise.all(existingTasks.docs.map((d) => deleteDoc(d.ref)));
    await Promise.all(
      (parsed.tasks || []).map((t) => {
        const { id, ...rest } = t;
        return setDoc(doc(db, "tasks", id || uid()), rest);
      })
    );
    if (parsed.rules && parsed.rules.length) {
      const existingRules = await getDocs(collection(db, "rules"));
      await Promise.all(existingRules.docs.map((d) => deleteDoc(d.ref)));
      await Promise.all(parsed.rules.map((r) => setDoc(doc(db, "rules", r.id), r)));
    }
    pushAudit({ taskId: "backup", titulo: "—", acao: "restaurou um backup" });
    setShowBackup(false);
  };

  /* ------------------------------ derivados ------------------------------ */

  const tasksByDay = useMemo(() => {
    const map = {};
    weekDates.forEach((d) => (map[toKey(d)] = { demanda: [], projeto: [] }));
    tasks.forEach((t) => {
      if (t.status === "concluido") return;
      if (map[t.data]) map[t.data][t.tipo]?.push(t);
    });
    Object.values(map).forEach((day) => {
      day.demanda.sort((a, b) => taskOrdem(a) - taskOrdem(b));
      day.projeto.sort((a, b) => taskOrdem(a) - taskOrdem(b));
    });
    return map;
  }, [tasks, weekDates]);

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === "concluido").sort((a, b) => new Date(b.concluidoEm || 0) - new Date(a.concluidoEm || 0)),
    [tasks]
  );

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return auditLog;
    return auditLog.filter((h) => h.titulo.toLowerCase().includes(q) || h.por.toLowerCase().includes(q));
  }, [auditLog, historySearch]);

  const todayKey = toKey(new Date());

  if (!ready) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: MUTED, fontFamily: "-apple-system, Segoe UI, Roboto, sans-serif" }}>
        {offline ? "Não foi possível conectar ao Firebase. Confira a configuração em src/firebase.js." : "Carregando agenda…"}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: BG, minHeight: "100vh", color: INK }}>
      <div style={{ background: RED, color: "#fff", padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, maxWidth: "100%", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CalendarDays size={22} />
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: 0.2 }}>Agenda Semanal</h1>
            {offline && (
              <span title="Sem conexão com o banco de dados" style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.2)", padding: "3px 8px", borderRadius: 999, fontSize: 11 }}>
                <WifiOff size={12} /> offline
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12.5, opacity: 0.9 }}>Você é:</span>
            <select value={currentUser} onChange={(e) => setCurrentUser(e.target.value)}
              style={{ background: RED_DARK, color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
              <option value="">Visitante</option>
              {PEOPLE.map((p) => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, maxWidth: "100%", margin: "14px auto 0" }}>
          {[
            { id: "semana", label: "Semana", icon: CalendarDays },
            { id: "concluidas", label: "Concluídas", icon: CheckCircle2 },
            { id: "historico", label: "Histórico", icon: History },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: "8px 8px 0 0", border: "none", background: active ? BG : "rgba(255,255,255,0.12)", color: active ? RED : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: "100%", margin: "0 auto", padding: "18px 24px 60px" }}>
        {tab === "semana" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => setAnchorDate((d) => addDays(d, -7))} style={{ ...btnGhost, padding: "8px 10px", display: "flex" }}><ChevronLeft size={16} /></button>
                <div style={{ fontWeight: 800, fontSize: 15, minWidth: 190, textAlign: "center" }}>{formatRangeLabel(weekDates)}</div>
                <button onClick={() => setAnchorDate((d) => addDays(d, 7))} style={{ ...btnGhost, padding: "8px 10px", display: "flex" }}><ChevronRight size={16} /></button>
                <button onClick={() => setAnchorDate(new Date())} style={{ ...btnGhost, padding: "8px 12px" }}>Hoje</button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => setShowBackup(true)} style={{ ...btnGhost, display: "flex", alignItems: "center", gap: 6 }}><Download size={14} /> Backup</button>
                <button onClick={() => setShowSummary(true)} style={{ ...btnGhost, display: "flex", alignItems: "center", gap: 6 }}><MessageSquare size={14} /> Resumo por pessoa</button>
                <button onClick={() => setShowNewRule(true)} style={{ ...btnGhost, display: "flex", alignItems: "center", gap: 6 }}><Repeat size={14} /> Nova recorrência</button>
                <button onClick={() => setShowManageRules(true)} style={{ ...btnGhost, display: "flex", alignItems: "center", gap: 6 }}><Settings2 size={14} /> Gerenciar recorrências</button>
                <button onClick={() => setShowNewTask(todayKey)} style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6 }}><Plus size={14} /> Nova demanda/projeto</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
              {weekDates.map((date, i) => {
                const key = toKey(date);
                const isToday = key === todayKey;
                const dayTasks = tasksByDay[key] || { demanda: [], projeto: [] };
                const pendCount = dayTasks.demanda.length + dayTasks.projeto.length;
                return (
                  <div key={key} style={{ background: CARD, borderRadius: 12, border: `1.5px solid ${isToday ? RED : DIVIDER}`, display: "flex", flexDirection: "column", minHeight: 220 }}>
                    <div style={{ padding: "10px 12px", borderBottom: `1px solid ${DIVIDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", color: isToday ? RED : MUTED, letterSpacing: 0.4 }}>{DIAS_SEMANA[i]}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{formatDay(date)}</div>
                      </div>
                      {pendCount > 0 && (
                        <button title="Passar todas as pendentes deste dia para amanhã" onClick={() => handleTomorrowAllDay(key)} style={{ border: "none", background: "transparent", color: MUTED, cursor: "pointer", display: "flex", alignItems: "center" }}>
                          <ArrowRightCircle size={16} />
                        </button>
                      )}
                    </div>
                    <div style={{ padding: 10, flex: 1 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: "#c77700", textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.4 }}>Demandas</div>
                      {dayTasks.demanda.length === 0 && <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>Nada por aqui.</div>}
                      {dayTasks.demanda.map((t, idx) => (
                        <TaskCard key={t.id} task={t} onToggle={handleToggle} onTomorrow={handleTomorrow} onDelete={handleDelete}
                          onMoveUp={(task) => moveTask(task, "up")} onMoveDown={(task) => moveTask(task, "down")}
                          isFirst={idx === 0} isLast={idx === dayTasks.demanda.length - 1} />
                      ))}
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: "#2e7d32", textTransform: "uppercase", margin: "10px 0 6px", letterSpacing: 0.4 }}>Projetos</div>
                      {dayTasks.projeto.length === 0 && <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>Nada por aqui.</div>}
                      {dayTasks.projeto.map((t, idx) => (
                        <TaskCard key={t.id} task={t} onToggle={handleToggle} onTomorrow={handleTomorrow} onDelete={handleDelete}
                          onMoveUp={(task) => moveTask(task, "up")} onMoveDown={(task) => moveTask(task, "down")}
                          isFirst={idx === 0} isLast={idx === dayTasks.projeto.length - 1} />
                      ))}
                      <button onClick={() => setShowNewTask(key)} style={{ width: "100%", marginTop: 4, padding: "7px 0", borderRadius: 8, border: `1.5px dashed ${DIVIDER}`, background: "transparent", color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        <Plus size={13} /> Adicionar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "concluidas" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <ListChecks size={18} color={RED} />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Tarefas concluídas ({completedTasks.length})</h2>
            </div>
            {completedTasks.length === 0 && <p style={{ color: MUTED, fontSize: 13.5 }}>Nenhuma tarefa concluída ainda.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {completedTasks.map((t) => (
                <div key={t.id} style={{ background: CARD, border: `1px solid ${DIVIDER}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <button onClick={() => handleToggle(t)} title="Reabrir tarefa" style={{ width: 20, height: 20, borderRadius: 5, border: "none", background: "#66bb6a", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                      <Check size={13} color="#fff" strokeWidth={3} />
                    </button>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, textDecoration: "line-through" }}>{t.titulo}</div>
                      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>
                        Data: {t.data} · Concluída em {t.concluidoEm ? new Date(t.concluidoEm).toLocaleString("pt-BR") : "—"}
                      </div>
                    </div>
                  </div>
                  <AvatarStack pessoas={t.responsaveis} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "historico" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <History size={18} color={RED} />
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Histórico de alterações</h2>
              </div>
              <div style={{ position: "relative" }}>
                <Search size={14} color={MUTED} style={{ position: "absolute", left: 10, top: 10 }} />
                <input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Filtrar por tarefa ou responsável…" style={{ ...inputStyle, paddingLeft: 30, width: 260 }} />
              </div>
            </div>
            {filteredHistory.length === 0 && <p style={{ color: MUTED, fontSize: 13.5 }}>Nenhum registro encontrado.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredHistory.map((h) => (
                <div key={h.id} style={{ background: CARD, border: `1px solid ${DIVIDER}`, borderRadius: 8, padding: "9px 13px", display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
                  <Avatar nome={h.por} size={20} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700 }}>{h.por}</span> <span style={{ color: MUTED }}>{h.acao}:</span> <span style={{ fontWeight: 600 }}>{h.titulo}</span>
                  </div>
                  <div style={{ color: MUTED, fontSize: 11, whiteSpace: "nowrap" }}>{new Date(h.quando).toLocaleString("pt-BR")}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showNewTask && <NewTaskModal defaultDate={new Date(showNewTask + "T00:00:00")} onClose={() => setShowNewTask(null)} onSave={handleAddTask} />}
      {showNewRule && <RecurrenceModal onClose={() => setShowNewRule(false)} onSave={handleSaveRule} />}
      {editingRule && <RecurrenceModal initial={editingRule} onClose={() => setEditingRule(null)} onSave={handleSaveRule} />}
      {showManageRules && (
        <ManageRecurrencesModal rules={rules} onClose={() => setShowManageRules(false)}
          onNew={() => { setShowManageRules(false); setShowNewRule(true); }}
          onEdit={(r) => { setShowManageRules(false); setEditingRule(r); }}
          onDelete={handleDeleteRule} />
      )}
      {showSummary && <SummaryModal tasks={tasks} weekDates={weekDates} onClose={() => setShowSummary(false)} />}
      {showBackup && (
        <BackupModal tasks={tasks} rules={rules} removed={removed} auditLog={auditLog}
          onClose={() => setShowBackup(false)} onRestore={handleRestoreBackup} />
      )}
    </div>
  );
}
