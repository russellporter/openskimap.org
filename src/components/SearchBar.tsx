import { Paper } from "@material-ui/core";
import IconButton from "@material-ui/core/IconButton";
import InputBase from "@material-ui/core/InputBase";
import MenuIcon from "@material-ui/icons/Menu";
import SearchIcon from "@material-ui/icons/Search";
import * as React from "react";
import EventBus from "./EventBus";
import * as styles from "./SearchBar.css";

interface Props {
  eventBus: EventBus;
  width: number;
}

export default class SearchBar extends React.Component<Props, {}> {
  render() {
    const width = this.props.width;
    return (
      <Paper className={styles.root} style={{ width: width }} elevation={1}>
        <IconButton
          className={styles.iconButton}
          aria-label="Menu"
          onClick={this.props.eventBus.openSidebar}
        >
          <MenuIcon />
        </IconButton>
        <InputBase className={styles.input} placeholder="Search Ski Areas" />
        <IconButton className={styles.iconButton} aria-label="Search">
          <SearchIcon />
        </IconButton>
      </Paper>
    );
  }
}
