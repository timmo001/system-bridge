import React, { Fragment, ReactElement, useState } from "react";
import ButtonBase from "@material-ui/core/ButtonBase";
import Card from "@material-ui/core/Card";
import CardMedia from "@material-ui/core/CardMedia";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";

import { MediaType } from "./Types";
import useStyles from "assets/jss/components/layout";

interface SliderProps {
  hideCaption?: boolean;
  hidePaper?: boolean;
  hideTitle?: boolean;
  media: MediaType;
  showAsImage?: boolean;
}

function Image({
  hideCaption,
  hidePaper,
  hideTitle,
  media,
  showAsImage,
}: SliderProps): ReactElement {
  const [showDialog, setShowDialog] = useState<boolean>(false);

  const openMediaDialog = () => setShowDialog(true);
  const closeMediaDialog = () => setShowDialog(false);

  const classes = useStyles();

  return (
    <Fragment>
      <ButtonBase
        className={!showAsImage ? classes.galleryItem : ""}
        onClick={openMediaDialog}>
        <Card className={classes.galleryItemCard} elevation={hidePaper ? 0 : 1}>
          {showAsImage ? (
            <img src={media.url} alt={media.alternativeText} />
          ) : (
            <CardMedia
              className={classes.galleryItemMedia}
              image={media.url}
              title={media.alternativeText}
            />
          )}
          {!hideTitle ? (
            <Typography variant="h5">{media.alternativeText}</Typography>
          ) : (
            ""
          )}
        </Card>
      </ButtonBase>
      <Dialog
        aria-describedby="scroll-dialog-description"
        aria-labelledby="scroll-dialog-title"
        maxWidth="xl"
        scroll="body"
        open={showDialog}
        onClick={closeMediaDialog}
        onClose={closeMediaDialog}>
        {showDialog ? (
          <Fragment>
            {!hideTitle && media.alternativeText ? (
              <DialogTitle>
                <Typography variant="h3">{media.alternativeText}</Typography>
              </DialogTitle>
            ) : (
              ""
            )}
            <DialogContent>
              {!hideCaption && media.caption ? (
                <Typography variant="body1" gutterBottom>
                  {media.caption}
                </Typography>
              ) : (
                ""
              )}
              <img src={media.url} alt={media.alternativeText} />
            </DialogContent>
          </Fragment>
        ) : (
          ""
        )}
      </Dialog>
    </Fragment>
  );
}

export default Image;
