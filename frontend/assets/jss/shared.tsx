const drawerWidth = 260;

const transition = {
  transition: "all 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)",
};

const boxShadow = {
  boxShadow:
    "0 10px 30px -12px rgba(0, 0, 0, 0.42), 0 4px 25px 0px rgba(0, 0, 0, 0.12), 0 8px 10px -5px rgba(0, 0, 0, 0.2)",
};

const defaultFont = {
  fontWeight: 300,
  lineHeight: "1.5em",
};

const cardActions = {
  margin: "0 20px 10px",
  paddingTop: 10,
  borderTop: "1px solid #eeeeee",
  height: "auto",
  ...defaultFont,
};

const cardHeader = {
  margin: "-30px 15px 0",
  borderRadius: 3,
  padding: 15,
};

export {
  drawerWidth,
  transition,
  boxShadow,
  defaultFont,
  cardActions,
  cardHeader,
};
