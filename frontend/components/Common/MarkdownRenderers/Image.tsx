import React, { ReactElement } from "react";
import { ReactMarkdownProps } from "react-markdown/lib/ast-to-react";

import ImageComponent from "../Image";

function Image({
  alt,
  src,
}: JSX.IntrinsicElements["img"] & ReactMarkdownProps): ReactElement {
  return (
    <ImageComponent
      hideCaption
      hidePaper
      hideTitle
      showAsImage
      media={{
        alternativeText: alt as string,
        url: src as string,
      }}
    />
  );
}

export default Image;
