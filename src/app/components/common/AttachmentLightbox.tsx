"use client";

import React, { useMemo } from "react";
import Lightbox, { SlideImage } from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Download from "yet-another-react-lightbox/plugins/download";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/counter.css";

export type AttachmentLightboxSlide = {
  src: string;
  alt?: string;
  downloadFilename?: string;
};

type AttachmentLightboxProps = {
  open: boolean;
  index?: number;
  slides: AttachmentLightboxSlide[];
  onClose: () => void;
};

const AttachmentLightbox = ({
  open,
  index = 0,
  slides,
  onClose,
}: AttachmentLightboxProps) => {
  const lightboxSlides: SlideImage[] = useMemo(
    () =>
      slides.map((slide) => ({
        src: slide.src,
        alt: slide.alt,
        download: {
          url: slide.src,
          filename: slide.downloadFilename ?? `image-${index + 1}.jpg`,
        },
      })),
    [slides],
  );

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={lightboxSlides}
      plugins={[Zoom, Fullscreen, Download, Thumbnails, Counter]}
      // Always finite so thumbnails match the real attachment count
      // (infinite carousel can show a wrap-around clone as an extra thumb).
      carousel={{ finite: true }}
      controller={{ closeOnBackdropClick: true }}
      zoom={{
        maxZoomPixelRatio: 4,
        scrollToZoom: true,
      }}
      thumbnails={{
        position: "bottom",
        width: 72,
        height: 72,
        border: 0,
        borderRadius: 6,
        padding: 4,
        gap: 8,
      }}
    />
  );
};

export default AttachmentLightbox;
