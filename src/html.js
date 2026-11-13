export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const button=(label,action,extra='')=>`<button type="button" data-action="${action}" ${extra}>${label}</button>`;
export const help=(topic,label='?')=>`<button type="button" class="help-link" data-guide="${esc(topic)}" aria-label="Guide: ${esc(topic)}">${label}</button>`;
export const field=(label,input)=>`<label><span>${label} ${help(label)}</span>${input}</label>`;
export const input=(name,value='',extra='')=>`<input name="${name}" value="${esc(value)}" ${extra}>`;
export function select(name,values,value,extra=''){return `<select name="${name}" ${extra}>${values.map(v=>{const [key,label]=Array.isArray(v)?v:[v,v];return `<option value="${esc(key)}" ${String(key)===String(value)?'selected':''}>${esc(label)}</option>`;}).join('')}</select>`;}
export const check=(name,label,on)=>`<label class="check"><input name="${name}" type="checkbox" ${on?'checked':''}>${label} ${help(label)}</label>`;
