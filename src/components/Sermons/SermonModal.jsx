import { motion, AnimatePresence } from "framer-motion";

export default function SermonModal({ open, onClose, mediaUrl, type }) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-content"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>

          {/* VIDEO */}
          {type === "video" && (
            <iframe
              src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
                mediaUrl
              )}&show_text=false&width=900`}
              width="100%"
              height="480"
              style={{ border: "none" }}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Sermon Video"
            />
          )}

          {/* AUDIO */}
          {type === "audio" && (
            <iframe
              src={`https://audiomack.com/embed/song/${mediaUrl}`}
              width="100%"
              height="190"
              scrolling="no"
              frameBorder="0"
              title="Sermon Audio"
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
