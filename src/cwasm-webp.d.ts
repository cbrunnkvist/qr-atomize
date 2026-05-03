declare module '@cwasm/webp' {
  interface ImageData {
    width: number;
    height: number;
    data: Uint8Array;
  }
  function decode(source: Uint8Array): ImageData;
  export { decode };
}
