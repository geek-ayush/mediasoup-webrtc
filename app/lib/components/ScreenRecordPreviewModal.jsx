import React, { useEffect } from "react";
import { Modal, ModalBody, ModalHeader, Button, Row } from "reactstrap";
import RecordRTC from "recordrtc";

var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

const ScreenRecordPreviewModal = ({ recorder }) => {
  const getRandomString = () => {
    if (
      window.crypto &&
      window.crypto.getRandomValues &&
      navigator.userAgent.indexOf("Safari") === -1
    ) {
      var a = window.crypto.getRandomValues(new Uint32Array(3)),
        token = "";
      for (var i = 0, l = a.length; i < l; i++) {
        token += a[i].toString(36);
      }
      return token;
    } else {
      return (Math.random() * new Date().getTime())
        .toString(36)
        .replace(/\./g, "");
    }
  };
  const getFileName = (fileExtension) => {
    var d = new Date();
    var year = d.getFullYear();
    var month = d.getMonth();
    var date = d.getDate();
    return (
      "ScreenRecord-" +
      year +
      month +
      date +
      "-" +
      getRandomString() +
      "." +
      fileExtension
    );
  };
  const downloadScreenRecordVideo = () => {
    let recorderBlob = recorder;
    if (!recorderBlob) {
      return;
    }
    if (isSafari) {
      if (recorderBlob && recorderBlob.getDataURL) {
        recorderBlob.getDataURL(function (dataURL) {
          RecordRTC.SaveToDisk(dataURL, getFileName("mp4"));
        });
        return;
      }
    }
    if (recorderBlob) {
      var blob = recorderBlob;
      var file = new File([blob], getFileName("mp4"), {
        type: "video/mp4",
      });
      RecordRTC.invokeSaveAsDialog(file);
    }
  };

  useEffect(() => {
    downloadScreenRecordVideo();
  }, [recorder]);

  return <></>;
};

export default ScreenRecordPreviewModal;
