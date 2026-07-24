import {
  CONCRETE,
  SECTIONS,
  SHEATHING,
  SPECIES,
  name,
  type SectionUsage,
} from '../model/catalog';
import { generateBrace } from '../model/generators/brace';
import { cutLength, elementLength } from '../model/generators/util';
import type { OpeningDef, PrimitiveDef, Vec2 } from '../model/types';
import { useStore } from '../store';
import { useT } from '../useT';
import { Field, NumberField, ReadoutField, SelectField } from './fields';

const sectionId = (v: Vec2) => `${Math.round(v[0] * 1000)}x${Math.round(v[1] * 1000)}`;

function SectionSelect({
  label,
  value,
  usage,
  onChange,
}: {
  label: string;
  value: Vec2;
  usage: SectionUsage[];
  onChange: (v: Vec2) => void;
}) {
  const id = sectionId(value);
  const available = SECTIONS.filter((s) => usage.includes(s.usage));
  const inCatalog = available.some((s) => s.id === id);
  return (
    <Field label={`${label} [mm]`}>
      <select
        value={id}
        onChange={(e) => {
          const s = SECTIONS.find((x) => x.id === e.target.value);
          if (s) onChange(s.size);
        }}
      >
        {!inCatalog && <option value={id}>{`${id.replace('x', '×')} (custom)`}</option>}
        {available.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
    </Field>
  );
}

function SpeciesSelect({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  const lang = useStore((s) => s.language);
  return (
    <SelectField
      label={label}
      value={value ?? SPECIES[0].id}
      options={SPECIES.map((sp) => ({ value: sp.id, label: `${name(sp.name, lang)} · ${sp.pricePerM3} zł/m³` }))}
      onChange={onChange}
    />
  );
}

function SheathingSelect({
  label,
  value,
  onChange,
  allowNone,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  allowNone: boolean;
}) {
  const t = useT();
  const lang = useStore((s) => s.language);
  return (
    <SelectField
      label={label}
      value={value ?? 'none'}
      options={[
        ...(allowNone ? [{ value: 'none', label: t('props.noSheathing') }] : []),
        ...SHEATHING.map((s) => ({ value: s.id, label: `${name(s.name, lang)} · ${s.pricePerM2} zł/m²` })),
      ]}
      onChange={(v) => onChange(v === 'none' ? undefined : v)}
    />
  );
}

function ConcreteSelect({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const t = useT();
  const lang = useStore((s) => s.language);
  return (
    <SelectField
      label={t('props.concrete')}
      value={value ?? 'c16-20'}
      options={CONCRETE.map((c) => ({ value: c.id, label: `${name(c.name, lang)} · ${c.pricePerM3} zł/m³` }))}
      onChange={onChange}
    />
  );
}

function OpeningsEditor({
  openings,
  wallLength,
  onChange,
}: {
  openings: OpeningDef[];
  wallLength: number;
  onChange: (o: OpeningDef[]) => void;
}) {
  const t = useT();
  const set = (i: number, changes: Partial<OpeningDef>) =>
    onChange(openings.map((o, j) => (i === j ? { ...o, ...changes } : o)));

  const add = (type: 'window' | 'door') =>
    onChange([
      ...openings,
      type === 'door'
        ? { type, offset: Math.max(0.2, wallLength / 2 - 0.45), width: 0.9, height: 2.05, sill: 0 }
        : { type, offset: Math.max(0.2, wallLength / 2 - 0.6), width: 1.2, height: 1.2, sill: 0.9 },
    ]);

  return (
    <div className="openings">
      <div className="openings-head">
        <span>{t('openings.title')} ({openings.length})</span>
        <span>
          <button className="mini" onClick={() => add('window')}>{t('openings.addWindow')}</button>
          <button className="mini" onClick={() => add('door')}>{t('openings.addDoor')}</button>
        </span>
      </div>
      {openings.map((o, i) => (
        <div key={i} className="opening">
          <div className="opening-title">
            <strong>{o.type === 'door' ? t('openings.door') : t('openings.window')}</strong>
            <button className="mini remove" onClick={() => onChange(openings.filter((_, j) => j !== i))}>{t('openings.remove')}</button>
          </div>
          <div className="field-grid">
            <NumberField label={t('openings.offset')} value={o.offset} min={0} max={wallLength} onChange={(v) => set(i, { offset: v })} />
            <NumberField label={t('openings.width')} value={o.width} min={0.2} onChange={(v) => set(i, { width: v })} />
            <NumberField label={t('openings.height')} value={o.height} min={0.2} onChange={(v) => set(i, { height: v })} />
            <NumberField label={t('openings.sill')} value={o.sill ?? (o.type === 'door' ? 0 : 0.9)} min={0} onChange={(v) => set(i, { sill: v })} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PropertiesPanel() {
  const t = useT();
  const selected = useStore((s) => s.selected);
  const primitives = useStore((s) => s.primitives);
  const update = useStore((s) => s.update);
  const remove = useStore((s) => s.remove);

  const def = primitives.find((p) => p.id === selected);
  if (!def) {
    return (
      <section>
        <h2>{t('props.title')}</h2>
        <p className="hint">{t('props.empty')}</p>
      </section>
    );
  }

  const set = (changes: Partial<PrimitiveDef>) => update(def.id, changes);

  return (
    <section className="properties">
      <h2>
        {def.label ?? 'Element'}
        <button className="mini remove" onClick={() => remove(def.id)}>{t('props.remove')}</button>
      </h2>
      <div className="field-grid">{fieldsByType(def, set, t)}</div>
      {def.type === 'wall' && (
        <OpeningsEditor
          openings={def.openings ?? []}
          wallLength={Math.hypot(def.to[0] - def.from[0], def.to[1] - def.from[1])}
          onChange={(openings) => set({ openings })}
        />
      )}
    </section>
  );
}

function fieldsByType(
  def: PrimitiveDef,
  set: (c: Partial<PrimitiveDef>) => void,
  t: (k: string, v?: Record<string, string | number>) => string,
) {
  switch (def.type) {
    case 'wall': {
      const L = Math.hypot(def.to[0] - def.from[0], def.to[1] - def.from[1]);
      return (
        <>
          <ReadoutField label={`${t('props.length')} [m]`} value={L.toFixed(2)} />
          <NumberField label={t('props.height')} value={def.height} min={0.3} onChange={(v) => set({ height: v })} />
          <NumberField label={t('props.baseLevel')} value={def.z ?? 0} onChange={(v) => set({ z: v })} />
          <NumberField label={t('props.studSpacing')} value={def.studSpacing ?? 0.6} step={0.05} min={0.2} onChange={(v) => set({ studSpacing: v })} />
          <SectionSelect label={t('props.studSection')} value={def.section ?? [0.06, 0.14]} usage={['lumber']} onChange={(section) => set({ section })} />
          <SpeciesSelect label={t('props.species')} value={def.species} onChange={(species) => set({ species })} />
          <SheathingSelect label={t('props.sheathing')} value={def.sheathing} allowNone onChange={(sheathing) => set({ sheathing })} />
          <SelectField
            label={t('props.sheathingSide')}
            value={String(def.sheathingSide ?? 1)}
            options={[
              { value: '1', label: t('props.sideLeft') },
              { value: '-1', label: t('props.sideRight') },
            ]}
            onChange={(v) => set({ sheathingSide: Number(v) as 1 | -1 })}
          />
        </>
      );
    }
    case 'beam': {
      const L = Math.hypot(def.to[0] - def.from[0], def.to[1] - def.from[1]);
      return (
        <>
          <ReadoutField label={`${t('props.lengthPlan')} [m]`} value={L.toFixed(2)} />
          <NumberField label={t('props.startLevel')} value={def.from[2]} onChange={(v) => set({ from: [def.from[0], def.from[1], v] })} />
          <NumberField label={t('props.endLevel')} value={def.to[2]} onChange={(v) => set({ to: [def.to[0], def.to[1], v] })} />
          <SectionSelect label={t('props.section')} value={def.section} usage={['lumber', 'post']} onChange={(section) => set({ section })} />
          <SpeciesSelect label={t('props.species')} value={def.species} onChange={(species) => set({ species })} />
        </>
      );
    }
    case 'post':
      return (
        <>
          <NumberField label={t('props.height')} value={def.height} min={0.2} onChange={(v) => set({ height: v })} />
          <NumberField label={t('props.basePosition')} value={def.z ?? 0} onChange={(v) => set({ z: v })} />
          <NumberField label={t('props.positionX')} value={def.position[0]} onChange={(v) => set({ position: [v, def.position[1]] })} />
          <NumberField label={t('props.positionY')} value={def.position[1]} onChange={(v) => set({ position: [def.position[0], v] })} />
          <SectionSelect label={t('props.section')} value={def.section} usage={['post', 'lumber']} onChange={(section) => set({ section })} />
          <SpeciesSelect label={t('props.species')} value={def.species} onChange={(species) => set({ species })} />
        </>
      );
    case 'deck':
      return (
        <>
          <NumberField label={t('props.widthX')} value={def.size[0]} min={0.2} onChange={(v) => set({ size: [v, def.size[1]] })} />
          <NumberField label={t('props.depthY')} value={def.size[1]} min={0.2} onChange={(v) => set({ size: [def.size[0], v] })} />
          <NumberField label={t('props.deckTopLevel')} value={def.level} onChange={(v) => set({ level: v })} />
          <SelectField
            label={t('props.joistDirection')}
            value={def.joistDirection ?? 'y'}
            options={[
              { value: 'y', label: t('props.joistDirY') },
              { value: 'x', label: t('props.joistDirX') },
            ]}
            onChange={(v) => set({ joistDirection: v })}
          />
          <NumberField label={t('props.joistSpacing')} value={def.joistSpacing ?? 0.5} step={0.05} min={0.2} onChange={(v) => set({ joistSpacing: v })} />
          <SectionSelect label={t('props.joistSection')} value={def.joistSection ?? [0.045, 0.145]} usage={['lumber']} onChange={(joistSection) => set({ joistSection })} />
          <SpeciesSelect label={t('props.joistSpecies')} value={def.species} onChange={(species) => set({ species })} />
          <SpeciesSelect label={t('props.boardSpecies')} value={def.boardSpecies} onChange={(boardSpecies) => set({ boardSpecies })} />
          <NumberField label={t('props.boardWidth')} value={def.board?.width ?? 0.14} step={0.005} min={0.05} onChange={(v) => set({ board: { ...def.board, width: v } })} />
          <NumberField label={t('props.gap')} value={def.board?.gap ?? 0.006} step={0.001} min={0} onChange={(v) => set({ board: { ...def.board, gap: v } })} />
        </>
      );
    case 'monoPitchRoof':
      return (
        <>
          <NumberField label={t('props.widthX')} value={def.size[0]} min={0.5} onChange={(v) => set({ size: [v, def.size[1]] })} />
          <NumberField label={t('props.depthY')} value={def.size[1]} min={0.5} onChange={(v) => set({ size: [def.size[0], v] })} />
          <NumberField label={t('props.angle')} value={def.pitch} step={1} min={1} max={60} unit="°" onChange={(pitch) => set({ pitch })} />
          <SelectField
            label={t('props.slopeDir')}
            value={def.slopeDirection}
            options={[
              { value: '-x', label: '−X' },
              { value: '+x', label: '+X' },
              { value: '-y', label: '−Y' },
              { value: '+y', label: '+Y' },
            ]}
            onChange={(slopeDirection) => set({ slopeDirection })}
          />
          <NumberField label={t('props.lowEdgeLevel')} value={def.z} onChange={(z) => set({ z })} />
          <NumberField label={t('props.eaves')} value={def.eaves ?? 0.3} onChange={(eaves) => set({ eaves })} />
          <NumberField label={t('props.eavesAtWall')} value={def.eavesHigh ?? def.eaves ?? 0.3} onChange={(eavesHigh) => set({ eavesHigh })} />
          <NumberField label={t('props.rafterSpacing')} value={def.rafterSpacing ?? 0.6} step={0.05} min={0.2} onChange={(rafterSpacing) => set({ rafterSpacing })} />
          <SectionSelect label={t('props.rafterSection')} value={def.rafterSection ?? [0.06, 0.16]} usage={['lumber']} onChange={(rafterSection) => set({ rafterSection })} />
          <SpeciesSelect label={t('props.species')} value={def.species} onChange={(species) => set({ species })} />
          <SheathingSelect label={t('props.sheathing')} value={def.sheathing ?? 'osb22'} allowNone={false} onChange={(sheathing) => set({ sheathing })} />
        </>
      );
    case 'gableRoof':
      return (
        <>
          <NumberField label={t('props.widthX')} value={def.size[0]} min={0.5} onChange={(v) => set({ size: [v, def.size[1]] })} />
          <NumberField label={t('props.depthY')} value={def.size[1]} min={0.5} onChange={(v) => set({ size: [def.size[0], v] })} />
          <NumberField label={t('props.angle')} value={def.pitch} step={1} min={5} max={70} unit="°" onChange={(pitch) => set({ pitch })} />
          <SelectField
            label={t('props.ridgeDir')}
            value={def.ridgeDirection}
            options={[
              { value: 'y', label: t('props.axisY') },
              { value: 'x', label: t('props.axisX') },
            ]}
            onChange={(ridgeDirection) => set({ ridgeDirection })}
          />
          <NumberField label={t('props.eavesLevel')} value={def.z} onChange={(z) => set({ z })} />
          <NumberField label={t('props.eaves')} value={def.eaves ?? 0.4} onChange={(eaves) => set({ eaves })} />
          <NumberField label={t('props.rafterSpacing')} value={def.rafterSpacing ?? 0.6} step={0.05} min={0.2} onChange={(rafterSpacing) => set({ rafterSpacing })} />
          <SectionSelect label={t('props.rafterSection')} value={def.rafterSection ?? [0.06, 0.18]} usage={['lumber']} onChange={(rafterSection) => set({ rafterSection })} />
          <SectionSelect label={t('props.ridgeSection')} value={def.ridgeSection ?? [0.08, 0.18]} usage={['lumber', 'post']} onChange={(ridgeSection) => set({ ridgeSection })} />
          <SpeciesSelect label={t('props.species')} value={def.species} onChange={(species) => set({ species })} />
          <SheathingSelect label={t('props.sheathing')} value={def.sheathing ?? 'osb22'} allowNone={false} onChange={(sheathing) => set({ sheathing })} />
        </>
      );
    case 'brace': {
      const reach = Math.hypot(def.to[0] - def.from[0], def.to[1] - def.from[1]);
      const arm = def.verticalArm ?? 0.6;
      const angle = (Math.atan2(arm, reach) * 180) / Math.PI;
      // read the real member back from the generator rather than re-deriving the
      // cuts here — a second copy of the geometry only drifts out of step
      const member = generateBrace(def)[0];
      const axis = elementLength(member);
      const stock = cutLength(member);
      const sideMiter = member.startSideMiter ?? 0;
      return (
        <>
          <ReadoutField label={`${t('props.braceLength')} [m]`} value={axis.toFixed(3)} />
          <ReadoutField label={`${t('props.braceMaterial')} [m]`} value={stock.toFixed(3)} />
          <ReadoutField label={`${t('props.braceAngle')} [°]`} value={angle.toFixed(1)} />
          <ReadoutField
            label={`${t('props.braceMiter')} [°]`}
            value={`${(member.startMiter ?? 0).toFixed(1)} / ${Math.abs(member.endMiter ?? 0).toFixed(1)}`}
          />
          {Math.abs(sideMiter) >= 0.05 && (
            <ReadoutField label={`${t('props.braceSideMiter')} [°]`} value={sideMiter.toFixed(1)} />
          )}
          <NumberField
            label={t('props.braceReach')}
            value={reach}
            min={0.1}
            onChange={(v) => {
              const k = v / (reach || 1);
              set({ to: [def.from[0] + (def.to[0] - def.from[0]) * k, def.from[1] + (def.to[1] - def.from[1]) * k] });
            }}
          />
          <NumberField label={t('props.braceDrop')} value={arm} min={0.1} onChange={(verticalArm) => set({ verticalArm })} />
          <NumberField label={t('props.braceAtBeam')} value={def.topLevel} onChange={(topLevel) => set({ topLevel })} />
          <SectionSelect label={t('props.section')} value={def.section ?? [0.08, 0.12]} usage={['lumber', 'post']} onChange={(section) => set({ section })} />
          <SpeciesSelect label={t('props.species')} value={def.species} onChange={(species) => set({ species })} />
          <label className="check in-fields">
            <input type="checkbox" checked={def.bothSides ?? false} onChange={(e) => set({ bothSides: e.target.checked })} />
            {t('props.bracePair')}
          </label>
        </>
      );
    }
    case 'slab':
      return (
        <>
          <NumberField label={t('props.widthX')} value={def.size[0]} min={0.3} onChange={(v) => set({ size: [v, def.size[1]] })} />
          <NumberField label={t('props.depthY')} value={def.size[1]} min={0.3} onChange={(v) => set({ size: [def.size[0], v] })} />
          <NumberField label={t('props.thickness')} value={def.thickness} step={0.05} min={0.1} onChange={(thickness) => set({ thickness })} />
          <NumberField label={t('props.topLevel')} value={def.z ?? 0} onChange={(z) => set({ z })} />
          <ConcreteSelect value={def.concreteClass} onChange={(concreteClass) => set({ concreteClass })} />
        </>
      );
  }
}
