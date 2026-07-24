import { useRef, useState } from 'react';
import { TYPES } from '../model/defaults';
import { readProject } from '../model/migrate';
import { TEMPLATES } from '../templates';
import { useStore } from '../store';
import { useT } from '../useT';
import { PriceEditor } from './PriceEditor';
import { ReportView } from './ReportView';

function download(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function Toolbar() {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const name = useStore((s) => s.name);
  const tool = useStore((s) => s.tool);
  const workLevel = useStore((s) => s.workLevel);
  const gridStep = useStore((s) => s.gridStep);
  const primitives = useStore((s) => s.primitives);
  const history = useStore((s) => s.history);
  const historyIndex = useStore((s) => s.historyIndex);
  const language = useStore((s) => s.language);

  const setTool = useStore((s) => s.setTool);
  const setWorkLevel = useStore((s) => s.setWorkLevel);
  const setGridStep = useStore((s) => s.setGridStep);
  const setName = useStore((s) => s.setName);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const load = useStore((s) => s.load);
  const reset = useStore((s) => s.reset);
  const setLanguage = useStore((s) => s.setLanguage);

  // empty name = untranslated default; show the translated "New project"
  const displayName = name.trim() === '' ? t('project.new') : name;
  const fileBase = (name.trim() === '' ? t('project.new') : name).replace(/[^\w\-]+/g, '_');

  const loadFile = async (f: File) => {
    try {
      const project = readProject(JSON.parse(await f.text()));
      if (!project) throw new Error(t('toolbar.badFile'));
      load(project.name || f.name.replace(/\.json$/i, ''), project.primitives);
    } catch (e) {
      alert(t('toolbar.loadError', { msg: (e as Error).message }));
    }
  };

  return (
    <header className="toolbar">
      <div className="group">
        <input
          className="project-name"
          value={displayName}
          onChange={(e) => setName(e.target.value)}
          aria-label={t('toolbar.projectName')}
        />
      </div>

      <div className="group tools">
        <button className={tool === 'select' ? 'active' : ''} onClick={() => setTool('select')}>
          {t('toolbar.select')}
        </button>
        {TYPES.map((ty) => (
          <button key={ty.type} className={tool === ty.type ? 'active' : ''} onClick={() => setTool(ty.type)}>
            {t(ty.labelKey)}
          </button>
        ))}
      </div>

      <div className="group">
        <button onClick={undo} disabled={historyIndex <= 0} title={t('toolbar.undo')}>↶</button>
        <button onClick={redo} disabled={historyIndex >= history.length - 1} title={t('toolbar.redo')}>↷</button>
      </div>

      <div className="group">
        <label className="toolbar-field">
          <span>{t('toolbar.workLevel')}</span>
          <input type="number" value={workLevel} step={0.1} onChange={(e) => setWorkLevel(Number(e.target.value))} />
        </label>
        <label className="toolbar-field">
          <span>{t('toolbar.gridStep')}</span>
          <select value={gridStep} onChange={(e) => setGridStep(Number(e.target.value))}>
            <option value={0.01}>1 cm</option>
            <option value={0.05}>5 cm</option>
            <option value={0.1}>10 cm</option>
            <option value={0.25}>25 cm</option>
            <option value={0.5}>50 cm</option>
          </select>
        </label>
      </div>

      <div className="group right">
        <button className={language === 'pl' ? 'active' : ''} onClick={() => setLanguage('pl')} title={t('toolbar.language')}>PL</button>
        <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} title={t('toolbar.language')}>EN</button>
        <select
          value=""
          onChange={(e) => {
            const tpl = TEMPLATES.find((x) => x.id === e.target.value);
            if (tpl) load(t(tpl.nameKey), tpl.build());
          }}
          title={t('toolbar.template')}
        >
          <option value="">{t('toolbar.template')}</option>
          {TEMPLATES.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>{t(tpl.nameKey)}</option>
          ))}
        </select>
        <button onClick={() => (primitives.length === 0 || confirm(t('toolbar.clearConfirm'))) && reset()}>
          {t('toolbar.new')}
        </button>
        <button
          onClick={() =>
            download(JSON.stringify({ name: displayName, primitives }, null, 2), `${fileBase}.json`, 'application/json')
          }
        >
          {t('toolbar.save')}
        </button>
        <button onClick={() => fileInput.current?.click()}>{t('toolbar.load')}</button>
        <button onClick={() => setPriceOpen(true)}>{t('toolbar.prices')}</button>
        <button onClick={() => setReportOpen(true)}>{t('toolbar.report')}</button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void loadFile(f);
            e.target.value = '';
          }}
        />
      </div>
      {priceOpen && <PriceEditor onClose={() => setPriceOpen(false)} />}
      {reportOpen && <ReportView onClose={() => setReportOpen(false)} />}
    </header>
  );
}
