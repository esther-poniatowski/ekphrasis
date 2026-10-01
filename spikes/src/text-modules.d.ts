/** YAML files bundled as text by the esbuild target `spikes`. */
declare module "*.yaml" {
  const text: string;
  export default text;
}

declare module "*.yml" {
  const text: string;
  export default text;
}
