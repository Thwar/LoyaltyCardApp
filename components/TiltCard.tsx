"use client";
import { type ComponentProps } from "react";
import { CardPreview } from "./CardPreview";
import { TiltWrap } from "./TiltWrap";

// Loyalty stamp-card preview with the interactive 3D tilt (see TiltWrap).
export function TiltCard(props: ComponentProps<typeof CardPreview>) {
  return (
    <TiltWrap>
      <CardPreview {...props} />
    </TiltWrap>
  );
}
