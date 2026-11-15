// UTF-8 backing buffers keep immutable records outside the managed object heap.
// Persisted JSON is still the original, complete record format.
const encoder=new TextEncoder(),decoder=new TextDecoder();
export const encodeText=text=>encoder.encode(text);
export const decodeText=data=>typeof data==='string'?data:decoder.decode(data);
export const encodeField=value=>value===undefined?undefined:encodeText(JSON.stringify(value));
export const decodeField=data=>JSON.parse(decodeText(data));
