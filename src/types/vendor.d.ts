// mammoth 的浏览器打包版无官方类型,补最小声明
declare module "mammoth/mammoth.browser" {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{
    value: string;
    messages: unknown[];
  }>;
}
