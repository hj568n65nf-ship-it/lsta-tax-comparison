declare const docToText: {
 (input: ArrayBuffer | Uint8Array): string | null;
 sections(input: ArrayBuffer | Uint8Array): Record<string, unknown> | null;
};
export default docToText;
