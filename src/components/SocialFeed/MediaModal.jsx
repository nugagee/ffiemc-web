import { Modal } from "antd";

export function MediaModal({ open, onClose, media }) {
  return (
    <Modal open={open} onCancel={onClose} footer={null} width={800}>
      {media.mediaType === "video" && (
        <iframe src={media.mediaUrl} width="100%" height="450" />
      )}

      {media.mediaType === "audio" && (
        <iframe src={media.mediaUrl} width="100%" height="180" />
      )}
    </Modal>
  );
}
