declare module 'miio' {
  const miio: {
    device(options: { address: string; token: string; timeout?: number }): Promise<unknown>;
  };

  export default miio;
}
