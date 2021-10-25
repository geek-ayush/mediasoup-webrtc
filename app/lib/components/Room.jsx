import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import ReactTooltip from "react-tooltip";
import classnames from "classnames";
import clipboardCopy from "clipboard-copy";
import * as appPropTypes from "./appPropTypes";
import { withRoomContext } from "../RoomContext";
import * as requestActions from "../redux/requestActions";
import { Appear } from "./transitions";
import Me from "./Me";
import ChatInput from "./ChatInput";
import Peers from "./Peers";
import Stats from "./Stats";
import Notifications from "./Notifications";
import NetworkThrottle from "./NetworkThrottle";
import RecordRTC from "recordrtc";
import ScreenRecordPreviewModal from "./ScreenRecordPreviewModal";
import { Button, Row, Col, Container, Card, CardBody } from "reactstrap";
let recorder;

class Room extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      recordedVideoUrl: null,
      isOpenVideoModal: false,
      screen: null,
      camera: null,
      recorder: null,
      startDisable: false,
      stopDisable: true,
      loadModal: false,
    };
  }
  //to enable audio and video pass true to disable pass false
  captureCamera = (cb) => {
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: false, //make it true for video
      })
      .then(cb);
  };
  //access your screen width and height  using window object adjusting camera position ,height and width  //after that pass screen and camera to recordrtc/and call startrecording method using recorder object to //start screen recording
  startScreenRecord = async () => {
    await this.setState({ stopDisable: false, startDisable: true });
    this.captureScreen((screen) => {
      console.log(screen, ">>>>startScreenRecord");
      this.captureCamera(async (camera) => {
        screen.width = window.screen.width;
        screen.height = window.screen.height;
        screen.fullcanvas = true;
        camera.width = 320;
        camera.height = 240;
        camera.top = screen.height - camera.height;
        camera.left = screen.width - camera.width;
        this.setState({
          screen: screen,
          camera: camera,
        });
        recorder = RecordRTC([screen, camera], {
          type: "video",
        });
        recorder.startRecording();
        recorder.screen = screen;
      });
    });
  };
  //to capture screen  we need to make sure that which media devices are captured and add listeners to // start and stop stream
  captureScreen = (callback) => {
    this.invokeGetDisplayMedia(
      (screen) => {
        console.log(screen, ">>>>captureScreen");
        this.addStreamStopListener(screen, () => {});
        callback(screen);
      },
      (error) => {
        console.error(error);
        alert(
          "Unable to capture your screen. Please check console logs.\n" + error
        );
        this.setState({ stopDisable: true, startDisable: false });
      }
    );
  };
  //tracks stop
  stopLocalVideo = async (screen, camera) => {
    [screen, camera].forEach(async (stream) => {
      stream.getTracks().forEach(async (track) => {
        track.stop();
      });
    });
  };
  //getting media items
  invokeGetDisplayMedia = (success, error) => {
    var displaymediastreamconstraints = {
      video: {
        displaySurface: "browser", // monitor, window, application, browser
        logicalSurface: true,
        cursor: "always", // never, always, motion
      },
    };
    // above constraints are NOT supported YET
    // that's why overridnig them
    displaymediastreamconstraints = {
      video: true,
      audio: true,
    };
    console.log(navigator, ">>>>>");
    if (navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices
        .getDisplayMedia(displaymediastreamconstraints)
        .then(success)
        .catch(error);
      // navigator.mediaDevices
      //   .getDisplayMedia(displaymediastreamconstraints)
      //   .then(success)
      //   .catch(error);
    }
    // else {
    //   navigator
    //     .getDisplayMedia(displaymediastreamconstraints)
    //     .then(success)
    //     .catch(error);
    // }
  };
  //adding event listener
  addStreamStopListener = (stream, callback) => {
    stream.addEventListener(
      "ended",
      () => {
        callback();
        callback = () => {};
      },
      false
    );
    stream.addEventListener(
      "inactive",
      () => {
        callback();
        callback = () => {};
      },
      false
    );
    stream.getTracks().forEach((track) => {
      track.addEventListener(
        "ended",
        () => {
          callback();
          callback = () => {};
        },
        false
      );
      track.addEventListener(
        "inactive",
        () => {
          callback();
          callback = () => {};
        },
        false
      );
    });
    stream.getVideoTracks()[0].onended = () => {
      this.stop();
    };
  };
  // stop screen recording
  stop = async () => {
    await this.setState({ startDisable: true });
    recorder.stopRecording(this.stopRecordingCallback);
  };
  //destory screen recording
  stopRecordingCallback = async () => {
    await this.stopLocalVideo(this.state.screen, this.state.camera);
    let recordedVideoUrl;
    if (recorder.getBlob()) {
      this.setState({
        recordPreview: recorder.getBlob(),
      });
      recordedVideoUrl = URL.createObjectURL(recorder.getBlob());
    }
    this.setState({
      recordedVideoUrl: recordedVideoUrl,
      screen: null,
      isOpenVideoModal: true,
      startDisable: false,
      stopDisable: true,
      camera: null,
    });
    recorder.screen.stop();
    recorder.destroy();
    recorder = null;
  };
  // stop audio recording
  stopLocalVideo = async (screen, camera) => {
    [screen, camera].forEach(async (stream) => {
      stream.getTracks().forEach(async (track) => {
        track.stop();
      });
    });
  };
  //close video modal
  videoModalClose = () => {
    this.setState({
      isOpenVideoModal: false,
    });
  };
  //open load alert
  openModal = async () => {
    await this.setState({ loadModal: false });
  };
  render() {
    window.onbeforeunload = this.openModal;
    const { roomClient, room, me, amActiveSpeaker, onRoomLinkCopy } =
      this.props;

    return (
      <Appear duration={300}>
        <div data-component="Room">
          <Notifications />
          <ScreenRecordPreviewModal
            isOpenVideoModal={this.state.isOpenVideoModal}
            videoModalClose={this.videoModalClose}
            recordedVideoUrl={this.state.recordedVideoUrl}
            recorder={this.state.recordPreview}
          />
          <div className="state" style={{ width: 135 }}>
            <div className={classnames("icon", room.state)} />
            <p className={classnames("text", room.state)}>
              {room.state}
              {this.state.startDisable && " | REC"}
            </p>
          </div>

          {/* <div className="room-link-wrapper">
            <div className="room-link">
              <a
                className="link"
                href={room.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  // If this is a 'Open in new window/tab' don't prevent
                  // click default action.
                  if (
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.metaKey ||
                    // Middle click (IE > 9 and everyone else).
                    (event.button && event.button === 1)
                  ) {
                    return;
                  }

                  event.preventDefault();

                  clipboardCopy(room.url).then(onRoomLinkCopy);
                }}
              >
                invitation link
              </a>
            </div>
          </div> */}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              height: "100vh",
              width: "100vw",
              justifyContent: "center",
              alignItems: "center",
              padding: 10,
            }}
          >
            <Peers />
            <Me />
          </div>
          {/* <div
            className={classnames("me-container", {
              "active-speaker": amActiveSpeaker,
            })}
          >
            <Me />
          </div> */}

          {/* <div className="chat-input-container">
            <ChatInput />
          </div> */}

          {/* <div className="sidebar">
            <div
              className={classnames("button", "hide-videos", {
                on: me.audioOnly,
                disabled: me.audioOnlyInProgress,
              })}
              data-tip={"Show/hide participants' video"}
              onClick={() => {
                me.audioOnly
                  ? roomClient.disableAudioOnly()
                  : roomClient.enableAudioOnly();
              }}
            />

            <div
              className={classnames("button", "mute-audio", {
                on: me.audioMuted,
              })}
              data-tip={"Mute/unmute participants' audio"}
              onClick={() => {
                me.audioMuted
                  ? roomClient.unmuteAudio()
                  : roomClient.muteAudio();
              }}
            />

            <div
              className={classnames("button", "restart-ice", {
                disabled: me.restartIceInProgress,
              })}
              data-tip="Restart ICE"
              onClick={() => roomClient.restartIce()}
            />
          </div> */}

          {/* <Stats /> */}

          <If condition={window.NETWORK_THROTTLE_SECRET}>
            <NetworkThrottle secret={window.NETWORK_THROTTLE_SECRET} />
          </If>
          <div
            style={{ position: "absolute", bottom: 0, right: 0, margin: 20 }}
          >
            {!this.state.startDisable && (
              <Button
                color="primary"
                outline
                onClick={() => this.startScreenRecord()}
                disabled={this.state.startDisable}
              >
                REC
              </Button>
            )}
            {!this.state.stopDisable && (
              <Button
                color="primary"
                onClick={() => this.stop()}
                disabled={this.state.stopDisable}
              >
                STOP
              </Button>
            )}
          </div>
          {/* <ReactTooltip
            type="light"
            effect="solid"
            delayShow={100}
            delayHide={100}
            delayUpdate={50}
          /> */}
        </div>
      </Appear>
    );
  }

  componentDidMount() {
    const { roomClient } = this.props;

    roomClient.join();
  }
}

Room.propTypes = {
  roomClient: PropTypes.any.isRequired,
  room: appPropTypes.Room.isRequired,
  me: appPropTypes.Me.isRequired,
  amActiveSpeaker: PropTypes.bool.isRequired,
  onRoomLinkCopy: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => {
  return {
    room: state.room,
    me: state.me,
    amActiveSpeaker: state.me.id === state.room.activeSpeakerId,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    onRoomLinkCopy: () => {
      dispatch(
        requestActions.notify({
          text: "Room link copied to the clipboard",
        })
      );
    },
  };
};

const RoomContainer = withRoomContext(
  connect(mapStateToProps, mapDispatchToProps)(Room)
);

export default RoomContainer;
