import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import * as appPropTypes from "./appPropTypes";
import { withRoomContext } from "../RoomContext";
import * as stateActions from "../redux/stateActions";
import PeerView from "./PeerView";
import styled from "styled-components";

const Container = styled.div`
  flex: 1;
  margin: 10px;
  border-radius: 20px;
  max-height: 90%;
  overflow: hidden;
`;

const Peer = (props) => {
  const {
    roomClient,
    peer,
    audioConsumer,
    videoConsumer,
    videoConsumerShare,
    audioMuted,
    faceDetection,
    onSetStatsPeerId,
  } = props;

  const audioEnabled =
    Boolean(audioConsumer) &&
    !audioConsumer.locallyPaused &&
    !audioConsumer.remotelyPaused;

  const videoVisible =
    (Boolean(videoConsumer) &&
      !videoConsumer.locallyPaused &&
      !videoConsumer.remotelyPaused) ||
    (Boolean(videoConsumerShare) &&
      !videoConsumerShare.locallyPaused &&
      !videoConsumerShare.remotelyPaused);
  return (
    <>
      <Container data-component="Peer">
        <div className="indicators">
          <If condition={!audioEnabled}>
            <div className="icon mic-off" />
          </If>

          <If condition={!videoConsumer || !videoConsumerShare}>
            <div className="icon webcam-off" />
          </If>
        </div>

        <PeerView
          peer={peer}
          audioConsumerId={audioConsumer ? audioConsumer.id : null}
          videoConsumerId={videoConsumer ? videoConsumer.id : null}
          audioRtpParameters={
            audioConsumer ? audioConsumer.rtpParameters : null
          }
          videoRtpParameters={
            videoConsumer ? videoConsumer.rtpParameters : null
          }
          consumerSpatialLayers={
            videoConsumer ? videoConsumer.spatialLayers : null
          }
          consumerTemporalLayers={
            videoConsumer ? videoConsumer.temporalLayers : null
          }
          consumerCurrentSpatialLayer={
            videoConsumer ? videoConsumer.currentSpatialLayer : null
          }
          consumerCurrentTemporalLayer={
            videoConsumer ? videoConsumer.currentTemporalLayer : null
          }
          consumerPreferredSpatialLayer={
            videoConsumer ? videoConsumer.preferredSpatialLayer : null
          }
          consumerPreferredTemporalLayer={
            videoConsumer ? videoConsumer.preferredTemporalLayer : null
          }
          consumerPriority={videoConsumer ? videoConsumer.priority : null}
          audioTrack={audioConsumer ? audioConsumer.track : null}
          videoTrack={videoConsumer ? videoConsumer.track : null}
          audioMuted={audioMuted}
          videoVisible={videoVisible}
          videoMultiLayer={videoConsumer && videoConsumer.type !== "simple"}
          audioCodec={audioConsumer ? audioConsumer.codec : null}
          videoCodec={videoConsumer ? videoConsumer.codec : null}
          audioScore={audioConsumer ? audioConsumer.score : null}
          videoScore={videoConsumer ? videoConsumer.score : null}
          faceDetection={faceDetection}
          onChangeVideoPreferredLayers={(spatialLayer, temporalLayer) => {
            roomClient.setConsumerPreferredLayers(
              videoConsumer.id,
              spatialLayer,
              temporalLayer
            );
          }}
          onChangeVideoPriority={(priority) => {
            roomClient.setConsumerPriority(videoConsumer.id, priority);
          }}
          onRequestKeyFrame={() => {
            roomClient.requestConsumerKeyFrame(videoConsumer.id);
          }}
          onStatsClick={onSetStatsPeerId}
        />
      </Container>
      {videoConsumerShare && (
        <Container data-component="Peer">
          <div className="indicators">
            <If condition={!audioEnabled}>
              <div className="icon mic-off" />
            </If>

            <If condition={!videoConsumer || !videoConsumerShare}>
              <div className="icon webcam-off" />
            </If>
          </div>

          <PeerView
            peer={peer}
            audioConsumerId={audioConsumer ? audioConsumer.id : null}
            videoConsumerId={videoConsumerShare ? videoConsumerShare.id : null}
            audioRtpParameters={
              audioConsumer ? audioConsumer.rtpParameters : null
            }
            videoRtpParameters={
              videoConsumerShare ? videoConsumerShare.rtpParameters : null
            }
            consumerSpatialLayers={
              videoConsumerShare ? videoConsumerShare.spatialLayers : null
            }
            consumerTemporalLayers={
              videoConsumerShare ? videoConsumerShare.temporalLayers : null
            }
            consumerCurrentSpatialLayer={
              videoConsumerShare ? videoConsumerShare.currentSpatialLayer : null
            }
            consumerCurrentTemporalLayer={
              videoConsumerShare
                ? videoConsumerShare.currentTemporalLayer
                : null
            }
            consumerPreferredSpatialLayer={
              videoConsumerShare
                ? videoConsumerShare.preferredSpatialLayer
                : null
            }
            consumerPreferredTemporalLayer={
              videoConsumerShare
                ? videoConsumerShare.preferredTemporalLayer
                : null
            }
            consumerPriority={
              videoConsumerShare ? videoConsumerShare.priority : null
            }
            audioTrack={audioConsumer ? audioConsumer.track : null}
            videoTrack={videoConsumerShare ? videoConsumerShare.track : null}
            audioMuted={audioMuted}
            videoVisible={videoVisible}
            videoMultiLayer={
              videoConsumerShare && videoConsumerShare.type !== "simple"
            }
            audioCodec={audioConsumer ? audioConsumer.codec : null}
            videoCodec={videoConsumerShare ? videoConsumerShare.codec : null}
            audioScore={audioConsumer ? audioConsumer.score : null}
            videoScore={videoConsumerShare ? videoConsumerShare.score : null}
            faceDetection={faceDetection}
            onChangeVideoPreferredLayers={(spatialLayer, temporalLayer) => {
              roomClient.setConsumerPreferredLayers(
                videoConsumerShare.id,
                spatialLayer,
                temporalLayer
              );
            }}
            onChangeVideoPriority={(priority) => {
              roomClient.setConsumerPriority(videoConsumerShare.id, priority);
            }}
            onRequestKeyFrame={() => {
              roomClient.requestConsumerKeyFrame(videoConsumerShare.id);
            }}
            onStatsClick={onSetStatsPeerId}
          />
        </Container>
      )}
    </>
  );
};

Peer.propTypes = {
  roomClient: PropTypes.any.isRequired,
  peer: appPropTypes.Peer.isRequired,
  audioConsumer: appPropTypes.Consumer,
  videoConsumer: appPropTypes.Consumer,
  audioMuted: PropTypes.bool,
  faceDetection: PropTypes.bool.isRequired,
  onSetStatsPeerId: PropTypes.func.isRequired,
};

const mapStateToProps = (state, { id }) => {
  const me = state.me;
  const peer = state.peers[id];
  const consumersArray = peer.consumers.map(
    (consumerId) => state.consumers[consumerId]
  );
  const audioConsumer = consumersArray.find(
    (consumer) => consumer.track.kind === "audio"
  );
  const videoConsumer = consumersArray.find(
    (consumer) =>
      consumer.track.kind === "video" &&
      consumer._appData.mediaTag === "cam-video"
  );
  const videoConsumerShare = consumersArray.find(
    (consumer) =>
      consumer.track.kind === "video" &&
      consumer._appData.mediaTag === "screen-video"
  );
  return {
    peer,
    audioConsumer,
    videoConsumer,
    videoConsumerShare,
    audioMuted: me.audioMuted,
    faceDetection: state.room.faceDetection,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    onSetStatsPeerId: (peerId) =>
      dispatch(stateActions.setRoomStatsPeerId(peerId)),
  };
};

const PeerContainer = withRoomContext(
  connect(mapStateToProps, mapDispatchToProps)(Peer)
);

export default PeerContainer;
