import { makeStyles, Theme } from "@material-ui/core/styles";

const layoutStyle = makeStyles((theme: Theme) => ({
  alert: {
    marginTop: theme.spacing(2),
  },
  cardOverflow: {
    overflow: "visible",
  },
  cardContentOverflow: {
    paddingTop: 140,
    "& h2": {
      textAlign: "center",
    },
    "& h3": {
      textAlign: "center",
    },
  },
  profile: {
    height: "280px !important",
    width: "280px !important",
  },
  name: {
    marginTop: 80,
  },
  main: {
    position: "relative",
    marginTop: 110,
  },
  navWrapper: {
    margin: "20px auto 50px auto",
    textAlign: "center",
  },
  footer: {
    marginTop: 16,
  },
  slider: {
    margin: theme.spacing(4, 2),
  },
  sliderMediaContainer: {
    padding: theme.spacing(1),
  },
  sliderMedia: {
    height: 420,
    backgroundSize: "contain",
  },
  galleryItem: {
    width: "100%",
  },
  galleryItemCard: {
    width: "100%",
  },
  galleryItemMedia: {
    width: "100%",
    height: 420,
    backgroundSize: "contain",
  },
  welcomeMessage: {
    margin: theme.spacing(2, 1),
  },
  title: {
    marginTop: theme.spacing(2),
  },
  flex: { flex: 1 },
}));

export default layoutStyle;
