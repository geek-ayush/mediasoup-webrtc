import React from "react";
import PropTypes from "prop-types";
import ReactTooltip from "react-tooltip";
import classnames from "classnames";
import Spinner from "react-spinner";
import clipboardCopy from "clipboard-copy";
import hark from "hark";
import * as faceapi from "face-api.js";
import Logger from "../Logger";
import * as appPropTypes from "./appPropTypes";
import EditableInput from "./EditableInput";

const logger = new Logger("PeerView");

const tinyFaceDetectorOptions = new faceapi.TinyFaceDetectorOptions({
  inputSize: 160,
  scoreThreshold: 0.5,
});

export default class PeerView extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      audioVolume: 0, // Integer from 0 to 10.,
      showInfo: window.SHOW_INFO || false,
      videoResolutionWidth: null,
      videoResolutionHeight: null,
      videoCanPlay: false,
      videoElemPaused: false,
      maxSpatialLayer: null,
    };

    // Latest received video track.
    // @type {MediaStreamTrack}
    this._audioTrack = null;

    // Latest received video track.
    // @type {MediaStreamTrack}
    this._videoTrack = null;

    // Hark instance.
    // @type {Object}
    this._hark = null;

    // Periodic timer for reading video resolution.
    this._videoResolutionPeriodicTimer = null;

    // requestAnimationFrame for face detection.
    this._faceDetectionRequestAnimationFrame = null;
  }

  render() {
    const {
      isMe,
      peer,
      audioProducerId,
      videoProducerId,
      audioConsumerId,
      videoConsumerId,
      videoRtpParameters,
      consumerSpatialLayers,
      consumerTemporalLayers,
      consumerCurrentSpatialLayer,
      consumerCurrentTemporalLayer,
      consumerPreferredSpatialLayer,
      consumerPreferredTemporalLayer,
      consumerPriority,
      audioMuted,
      videoVisible,
      videoMultiLayer,
      audioCodec,
      videoCodec,
      audioScore,
      videoScore,
      onChangeDisplayName,
      onChangeMaxSendingSpatialLayer,
      onChangeVideoPreferredLayers,
      onChangeVideoPriority,
      onRequestKeyFrame,
      onStatsClick,
    } = this.props;

    const {
      audioVolume,
      showInfo,
      videoResolutionWidth,
      videoResolutionHeight,
      videoCanPlay,
      videoElemPaused,
      maxSpatialLayer,
    } = this.state;

    return (
      <div data-component="PeerView">
        <div className="info">
          <div
            className={classnames("peer", { "is-me": isMe })}
            style={{ marginTop: "auto" }}
          >
            <Choose>
              <When condition={isMe}>
                <EditableInput
                  value={peer.displayName}
                  propName="displayName"
                  className="display-name editable"
                  classLoading="loading"
                  classInvalid="invalid"
                  shouldBlockWhileLoading
                  editProps={{
                    maxLength: 20,
                    autoCorrect: "false",
                    spellCheck: "false",
                  }}
                  onChange={({ displayName }) =>
                    onChangeDisplayName(displayName)
                  }
                />
              </When>
              <Otherwise>
                <span className="display-name">{peer.displayName}</span>
              </Otherwise>
            </Choose>

            <div className="row">
              <span className={classnames("device-icon", peer.device.flag)} />
              <span className="device-version">
                {peer.device.name} {peer.device.version || null}
              </span>
            </div>
          </div>
        </div>

        <video
          ref="videoElem"
          className={classnames({
            "is-me": isMe,
            hidden: !videoVisible || !videoCanPlay,
            "network-error":
              videoVisible &&
              videoMultiLayer &&
              consumerCurrentSpatialLayer === null,
          })}
          autoPlay
          playsInline
          muted
          controls={false}
        />

        <audio
          ref="audioElem"
          autoPlay
          playsInline
          muted={isMe || audioMuted}
          controls={false}
        />

        <canvas
          ref="canvas"
          className={classnames("face-detection", { "is-me": isMe })}
        />

        <div className="volume-container">
          <div className={classnames("bar", `level${audioVolume}`)} />
        </div>

        <If condition={videoVisible && videoScore < 5}>
          <div className="spinner-container">
            <Spinner />
          </div>
        </If>

        <If condition={videoElemPaused}>
          <div className="video-elem-paused" />
        </If>
      </div>
    );
  }

  componentDidMount() {
    const { audioTrack, videoTrack } = this.props;

    this._setTracks(audioTrack, videoTrack);
  }

  componentWillUnmount() {
    if (this._hark) this._hark.stop();

    clearInterval(this._videoResolutionPeriodicTimer);
    cancelAnimationFrame(this._faceDetectionRequestAnimationFrame);

    const { videoElem } = this.refs;

    if (videoElem) {
      videoElem.oncanplay = null;
      videoElem.onplay = null;
      videoElem.onpause = null;
    }
  }

  componentWillUpdate() {
    const { isMe, audioTrack, videoTrack, videoRtpParameters } = this.props;

    const { maxSpatialLayer } = this.state;

    if (isMe && videoRtpParameters && maxSpatialLayer === null) {
      this.setState({
        maxSpatialLayer: videoRtpParameters.encodings.length - 1,
      });
    } else if (isMe && !videoRtpParameters && maxSpatialLayer !== null) {
      this.setState({ maxSpatialLayer: null });
    }

    this._setTracks(audioTrack, videoTrack);
  }

  _setTracks(audioTrack, videoTrack) {
    const { faceDetection } = this.props;

    if (this._audioTrack === audioTrack && this._videoTrack === videoTrack)
      return;

    this._audioTrack = audioTrack;
    this._videoTrack = videoTrack;

    if (this._hark) this._hark.stop();

    this._stopVideoResolution();

    if (faceDetection) this._stopFaceDetection();

    const { audioElem, videoElem } = this.refs;

    if (audioTrack) {
      const stream = new MediaStream();

      stream.addTrack(audioTrack);
      audioElem.srcObject = stream;

      audioElem
        .play()
        .catch((error) => logger.warn("audioElem.play() failed:%o", error));

      this._runHark(stream);
    } else {
      audioElem.srcObject = null;
    }

    if (videoTrack) {
      const stream = new MediaStream();

      stream.addTrack(videoTrack);
      videoElem.srcObject = stream;

      videoElem.oncanplay = () => this.setState({ videoCanPlay: true });

      videoElem.onplay = () => {
        this.setState({ videoElemPaused: false });

        audioElem
          .play()
          .catch((error) => logger.warn("audioElem.play() failed:%o", error));
      };

      videoElem.onpause = () => this.setState({ videoElemPaused: true });

      videoElem
        .play()
        .catch((error) => logger.warn("videoElem.play() failed:%o", error));

      this._startVideoResolution();

      if (faceDetection) this._startFaceDetection();
    } else {
      videoElem.srcObject = null;
    }
  }

  _runHark(stream) {
    if (!stream.getAudioTracks()[0])
      throw new Error("_runHark() | given stream has no audio track");

    this._hark = hark(stream, { play: false });

    // eslint-disable-next-line no-unused-vars
    this._hark.on("volume_change", (dBs, threshold) => {
      // The exact formula to convert from dBs (-100..0) to linear (0..1) is:
      //   Math.pow(10, dBs / 20)
      // However it does not produce a visually useful output, so let exagerate
      // it a bit. Also, let convert it from 0..1 to 0..10 and avoid value 1 to
      // minimize component renderings.
      let audioVolume = Math.round(Math.pow(10, dBs / 85) * 10);

      if (audioVolume === 1) audioVolume = 0;

      if (audioVolume !== this.state.audioVolume)
        this.setState({ audioVolume });
    });
  }

  _startVideoResolution() {
    this._videoResolutionPeriodicTimer = setInterval(() => {
      const { videoResolutionWidth, videoResolutionHeight } = this.state;
      const { videoElem } = this.refs;

      if (
        videoElem.videoWidth !== videoResolutionWidth ||
        videoElem.videoHeight !== videoResolutionHeight
      ) {
        this.setState({
          videoResolutionWidth: videoElem.videoWidth,
          videoResolutionHeight: videoElem.videoHeight,
        });
      }
    }, 500);
  }

  _stopVideoResolution() {
    clearInterval(this._videoResolutionPeriodicTimer);

    this.setState({
      videoResolutionWidth: null,
      videoResolutionHeight: null,
    });
  }

  _startFaceDetection() {
    const { videoElem, canvas } = this.refs;

    const step = async () => {
      // NOTE: Somehow this is critical. Otherwise the Promise returned by
      // faceapi.detectSingleFace() never resolves or rejects.
      if (!this._videoTrack || videoElem.readyState < 2) {
        this._faceDetectionRequestAnimationFrame = requestAnimationFrame(step);

        return;
      }

      const detection = await faceapi.detectSingleFace(
        videoElem,
        tinyFaceDetectorOptions
      );

      if (detection) {
        const width = videoElem.offsetWidth;
        const height = videoElem.offsetHeight;

        canvas.width = width;
        canvas.height = height;

        // const resizedDetection = detection.forSize(width, height);
        const resizedDetections = faceapi.resizeResults(detection, {
          width,
          height,
        });

        faceapi.draw.drawDetections(canvas, resizedDetections);
      } else {
        // Trick to hide the canvas rectangle.
        canvas.width = 0;
        canvas.height = 0;
      }

      this._faceDetectionRequestAnimationFrame = requestAnimationFrame(() =>
        setTimeout(step, 100)
      );
    };

    step();
  }

  _stopFaceDetection() {
    cancelAnimationFrame(this._faceDetectionRequestAnimationFrame);

    const { canvas } = this.refs;

    canvas.width = 0;
    canvas.height = 0;
  }

  _printProducerScore(id, score) {
    const scores = Array.isArray(score) ? score : [score];

    return (
      <React.Fragment key={id}>
        <p>streams:</p>

        {scores
          .sort((a, b) => {
            if (a.rid) return a.rid > b.rid ? 1 : -1;
            else return a.ssrc > b.ssrc ? 1 : -1;
          })
          .map(
            (
              { ssrc, rid, score },
              idx // eslint-disable-line no-shadow
            ) => (
              <p key={idx} className="indent">
                <Choose>
                  <When condition={rid !== undefined}>
                    {`rid:${rid}, ssrc:${ssrc}, score:${score}`}
                  </When>

                  <Otherwise>{`ssrc:${ssrc}, score:${score}`}</Otherwise>
                </Choose>
              </p>
            )
          )}
      </React.Fragment>
    );
  }

  _printConsumerScore(id, score) {
    return (
      <p key={id}>
        {`score:${score.score}, producerScore:${score.producerScore}, producerScores:[${score.producerScores}]`}
      </p>
    );
  }
}

PeerView.propTypes = {
  isMe: PropTypes.bool,
  peer: PropTypes.oneOfType([appPropTypes.Me, appPropTypes.Peer]).isRequired,
  audioProducerId: PropTypes.string,
  videoProducerId: PropTypes.string,
  audioConsumerId: PropTypes.string,
  videoConsumerId: PropTypes.string,
  audioRtpParameters: PropTypes.object,
  videoRtpParameters: PropTypes.object,
  consumerSpatialLayers: PropTypes.number,
  consumerTemporalLayers: PropTypes.number,
  consumerCurrentSpatialLayer: PropTypes.number,
  consumerCurrentTemporalLayer: PropTypes.number,
  consumerPreferredSpatialLayer: PropTypes.number,
  consumerPreferredTemporalLayer: PropTypes.number,
  consumerPriority: PropTypes.number,
  audioTrack: PropTypes.any,
  videoTrack: PropTypes.any,
  audioMuted: PropTypes.bool,
  videoVisible: PropTypes.bool.isRequired,
  videoMultiLayer: PropTypes.bool,
  audioCodec: PropTypes.string,
  videoCodec: PropTypes.string,
  audioScore: PropTypes.any,
  videoScore: PropTypes.any,
  faceDetection: PropTypes.bool.isRequired,
  onChangeDisplayName: PropTypes.func,
  onChangeMaxSendingSpatialLayer: PropTypes.func,
  onChangeVideoPreferredLayers: PropTypes.func,
  onChangeVideoPriority: PropTypes.func,
  onRequestKeyFrame: PropTypes.func,
  onStatsClick: PropTypes.func.isRequired,
};
