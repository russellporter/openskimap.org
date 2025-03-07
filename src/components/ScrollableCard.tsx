import { Card, CardContent } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";

export const ScrollableCard: React.FunctionComponent<
  React.PropsWithChildren<{
    header: JSX.Element;
    footer?: JSX.Element;
    width?: number;
  }>
> = (props) => {
  const [showHeaderSeparator, setShowHeaderSeparator] = useState(false);
  const [showFooterSeparator, setShowFooterSeparator] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Function to check and update separator visibility
  const updateSeparators = () => {
    const card = cardRef.current;
    const content = contentRef.current;
    if (!card || !content) return;

    // Show header separator when scrolled down
    setShowHeaderSeparator(card.scrollTop > 0);
    
    // Show footer separator when content extends below the visible area
    const contentBottom = content.offsetTop + content.scrollHeight;
    const visibleBottom = card.scrollTop + card.clientHeight;
    setShowFooterSeparator(contentBottom > visibleBottom);
  };

  // Add scroll listener to check when content is underneath header/footer
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    card.addEventListener('scroll', updateSeparators);
    
    // Initial check
    updateSeparators();
    
    return () => {
      card.removeEventListener('scroll', updateSeparators);
    };
  }, []);

  // Add resize observer to handle dynamic content changes
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    // Create a ResizeObserver to detect content size changes
    const resizeObserver = new ResizeObserver(() => {
      updateSeparators();
    });

    // Observe the content element for any size changes
    resizeObserver.observe(content);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [props.children]); // Re-run when children change

  return (
    <Card
      ref={cardRef}
      style={{
        overflowY: "auto",
        maxHeight: "calc(100dvh - 78px)",
        width: props.width,
      }}
    >
      <div style={{ 
        position: "sticky", 
        top: 0, 
        backgroundColor: "white",
        zIndex: 1,
        borderBottom: showHeaderSeparator ? "1px solid rgba(0, 0, 0, 0.12)" : "none" 
      }}>
        {props.header}
      </div>
      <div ref={contentRef}>
        <CardContent style={{ paddingTop: "0px" }}>{props.children}</CardContent>
      </div>
      {props.footer && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            backgroundColor: "white",
            zIndex: 1,
            borderTop: showFooterSeparator ? "1px solid rgba(0, 0, 0, 0.12)" : "none",
          }}
        >
          {props.footer}
        </div>
      )}
    </Card>
  );
};
