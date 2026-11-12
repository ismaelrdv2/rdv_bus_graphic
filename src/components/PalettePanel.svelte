<script lang="ts">
  import { PALETTE_PRESETS, DEFAULT_COLORS, parseColor, toRgb, toHex } from '../lib/palette';
  import type { PaletteColors, PaletteId, ProjectPalette, TextColorRole } from '../lib/types';

  export let palette: ProjectPalette;
  export let onPreset: (value: PaletteId) => void;
  export let onColor: (key: keyof PaletteColors, value: string) => void;
  export let onAllText: (role: TextColorRole) => void;
  const keys: { key: keyof PaletteColors, title: string }[] = [
    {key:'primary', title:'Cor principal (destaque)'},
    {key:'secondary', title:'Cor secundária'},
    {key:'background', title:'Cor de fundo'},
  ];
  let invalidColor = '';
  let allTextRole: TextColorRole = 'white';
  function changeHtml(key: keyof PaletteColors, raw: string) {
    const parsed = parseColor(raw);
    if (!parsed) { invalidColor = `Cor inválida: ${raw}. Utilize #RRGGBB ou rgb(R,G,B).`; return; }
    invalidColor = '';
    onColor(key, parsed);
  }
  function changeRgb(key: keyof PaletteColors, channel: number, raw: string) {
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      invalidColor = 'Os canais R, G e B devem ficar entre 0 e 255.'; return;
    }
    invalidColor = '';
    const rgb = toRgb(palette.colors[key]);
    rgb[channel] = value;
    onColor(key,toHex(rgb[0],rgb[1],rgb[2]));
  }
</script>

<section class="property-section palette-section">
  <h3>Paleta de cores do projeto</h3>
  <label class="field"><span>Paletas predefinidas</span>
    <select value={palette.preset} on:change={event => onPreset(event.currentTarget.value as PaletteId)}>
      {#each PALETTE_PRESETS as entry}
        <option value={entry.id}>{entry.name}</option>
      {/each}
      <option value="custom">Personalizada — HEX / RGB</option>
    </select>
  </label>
  <div class="palette-options" aria-label="Prévia das paletas">
    {#each PALETTE_PRESETS as preset}
      <button type="button" class:palette-active={palette.preset===preset.id} title={preset.name} aria-label={preset.name} on:click={() => onPreset(preset.id)}>
        <span style={`background:${preset.colors.background}`}>
          <i style={`background:${preset.colors.primary}`}></i><i style={`background:${preset.colors.secondary}`}></i>
        </span>
      </button>
    {/each}
  </div>
  <p class="inspector-hint">Escolher uma paleta altera as cores de todos os elementos do projeto. Alterações nos valores ativam automaticamente a paleta personalizada.</p>
  {#each keys as field}
    <div class="palette-color-group">
      <label class="field"><span>{field.title}</span>
        <div class="palette-hex-input">
          <input type="color" value={palette.colors[field.key] || DEFAULT_COLORS[field.key]} aria-label={`Selecionar ${field.title}`} on:input={event => changeHtml(field.key,event.currentTarget.value)} />
          <input type="text" value={palette.colors[field.key]} maxlength="25" title="HEX ou rgb(R,G,B)" aria-label={`${field.title} em hexadecimal ou RGB`} on:change={event => changeHtml(field.key,event.currentTarget.value)} />
        </div>
      </label>
      <div class="palette-rgb-row">
        {#each ['R','G','B'] as channel, i}
          <label class="field"><span>{channel}</span><input type="number" min="0" max="255" step="1" value={toRgb(palette.colors[field.key])[i]} aria-label={`${field.title}: canal ${channel}`} on:change={event => changeRgb(field.key,i,event.currentTarget.value)} /></label>
        {/each}
      </div>
    </div>
  {/each}
  {#if invalidColor}<p class="error-text" role="alert">{invalidColor}</p>{/if}
  <div class="palette-color-group">
    <label class="field"><span>Cor de todos os textos do projeto</span>
      <select bind:value={allTextRole}>
        <option value="white">Branco</option>
        <option value="primary">Cor principal (destaque)</option>
        <option value="secondary">Cor secundária</option>
        <option value="original">Restaurar estilo original</option>
      </select>
    </label>
    <button class="button secondary-button fill" type="button" on:click={() => onAllText(allTextRole)}>Aplicar aos textos de todos os elementos</button>
  </div>
</section>
