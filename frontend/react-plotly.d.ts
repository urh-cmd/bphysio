declare module "react-plotly.js" {
  import { Component } from "react";
  interface PlotParams {
    data: object[];
    layout?: object;
    config?: object;
    style?: React.CSSProperties;
    useResizeHandler?: boolean;
    [key: string]: unknown;
  }
  const Plot: React.ComponentType<PlotParams>;
  export default Plot;
}
