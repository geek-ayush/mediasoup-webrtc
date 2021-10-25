import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import classnames from "classnames";
import * as appPropTypes from "./appPropTypes";
import { Appear } from "./transitions";
import Peer from "./Peer";

const Peers = ({ peers, activeSpeakerId }) => {
  return (
    <>
      {peers.map((peer) => {
        return <Peer id={peer.id} />;
      })}
    </>
  );
};

Peers.propTypes = {
  peers: PropTypes.arrayOf(appPropTypes.Peer).isRequired,
  activeSpeakerId: PropTypes.string,
};

const mapStateToProps = (state) => {
  const peersArray = Object.values(state.peers);

  return {
    peers: peersArray,
    activeSpeakerId: state.room.activeSpeakerId,
  };
};

const PeersContainer = connect(mapStateToProps, null, null, {
  areStatesEqual: (next, prev) => {
    return (
      prev.peers === next.peers &&
      prev.room.activeSpeakerId === next.room.activeSpeakerId
    );
  },
})(Peers);

export default PeersContainer;
