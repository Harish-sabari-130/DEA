import React, { useState, useEffect, useRef } from "react";
import img_bg from "./assets/images/image_4.jpg";
const Slide5: React.FC = () => {
  const outerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({
    s: 1,
    x: 0,
    y: 0
  });
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = Math.min(w / 960, h / 720);
      setLayout({
        s,
        x: (w - 960 * s) / 2,
        y: (h - 720 * s) / 2
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div id="slide-5" ref={outerRef} className="w-screen h-screen overflow-hidden relative" style={{
    backgroundColor: "#000"
  }}><div id="slide-inner-5" style={{
      position: "absolute",
      width: "960px",
      height: "720px",
      overflow: "hidden",
      transformOrigin: "top left",
      color: "#000000",
      backgroundImage: `url(${img_bg})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      transform: `scale(${layout.s})`,
      left: layout.x + "px",
      top: layout.y + "px"
    }}><div key={0} style={{
        position: "absolute",
        left: "216px",
        top: "46.55px",
        width: "712px",
        height: "58.16px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.2",
          paddingLeft: "96px",
          fontSize: "calc(30pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(30pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700",
            color: "#000000"
          }}>{"EXISTING SYSTEM"}</span></p></div><div key={1} style={{
        position: "absolute",
        left: "66.21px",
        top: "180px",
        width: "861.79px",
        height: "360px",
        boxSizing: "border-box",
        backgroundColor: "transparent"
      }}><p style={{
          lineHeight: "1.2",
          textIndent: "-36px",
          paddingLeft: "36px",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px",
            color: "#000000",
            fontSize: "20pt"
          }}>{"\u2B9A"}</span></p></div><div key={2} style={{
        position: "absolute",
        left: "82.86px",
        top: "109.47px",
        width: "846.77px",
        height: "591.32px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "justify",
          lineHeight: "1.8",
          textIndent: "-36px",
          paddingLeft: "36px",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px"
          }}>{"v"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"Recent medical AI frameworks use multi-agent orchestration and advanced memory systems to simulate clinical workflows but struggle to resolve direct guideline "}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"collisions."}</span></p><p style={{
          textAlign: "justify",
          lineHeight: "1.8",
          textIndent: "-36px",
          paddingLeft: "36px",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px"
          }}>{"v"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"Some architectures employ Corrective RAG to validate medical data, relying heavily on real-time web searches instead of established clinical hierarchies"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"."}</span></p><p style={{
          textAlign: "justify",
          lineHeight: "1.8",
          textIndent: "-36px",
          paddingLeft: "36px",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px"
          }}>{"v"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"Other systems attempt to detect clinical errors through multi-agent debate, which can lead to over-flagging and unreliable results without hard mathematical guardrails"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"."}</span></p><p style={{
          textAlign: "justify",
          lineHeight: "1.8",
          textIndent: "-36px",
          paddingLeft: "36px",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px"
          }}>{"v"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"Existing models that handle semantic conflicts typically use AI self-consistency to reach a consensus, failing to strictly enforce safe medical evidence prioritization."}</span></p></div></div></div>;
};
export default Slide5;
