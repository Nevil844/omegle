import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Socket, io } from "socket.io-client";

const URL = "https://neviltech.xyz";
// const URL = "http://localhost:3000";

export const Room = ({
  name,
  localAudioTrack,
  localVideoTrack,
}: {
  name: string;
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
}) => {
  const [searchParams] = useSearchParams();
  const [lobby, setLobby] = useState(true);
  const [socket, setSocket] = useState<null | Socket>(null);
  const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
  const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [message, setMessage] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);

  const remoteVideoRef = useRef<HTMLVideoElement>();
  const localVideoRef = useRef<HTMLVideoElement>();

  useEffect(() => {
    const socket = io(URL);

    socket.on("send-offer", async ({ roomId }) => {
      console.log("sending offer");
      setLobby(false);
      setRoomId(roomId);
      const pc = new RTCPeerConnection();

      setSendingPc(pc);
      if (localVideoTrack) {
        console.error("added track");
        console.log(localVideoTrack);
        pc.addTrack(localVideoTrack);
      }
      if (localAudioTrack) {
        console.error("added track");
        console.log(localAudioTrack);
        pc.addTrack(localAudioTrack);
      }

      pc.onicecandidate = async (e) => {
        console.log("receiving ice candidate locally");
        if (e.candidate) {
          socket.emit("add-ice-candidate", {
            candidate: e.candidate,
            type: "sender",
            roomId,
          });
        }
      };

      pc.onnegotiationneeded = async () => {
        console.log("on negotiation needed, sending offer");
        const sdp = await pc.createOffer();
        pc.setLocalDescription(sdp);
        socket.emit("offer", {
          sdp,
          roomId,
        });
      };
    });

    socket.on("offer", async ({ roomId, sdp: remoteSdp }) => {
      console.log("received offer");
      setLobby(false);
      setRoomId(roomId);
      const pc = new RTCPeerConnection();

      const stream = new MediaStream();
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setRemoteMediaStream(stream);
      setReceivingPc(pc);

      pc.ontrack = (e) => {
        console.error("inside ontrack");
        const { track, type } = e;
        if (type === "audio") {
          setRemoteAudioTrack(track);
          remoteVideoRef.current.srcObject.addTrack(track);
        } else {
          setRemoteVideoTrack(track);
          remoteVideoRef.current.srcObject.addTrack(track);
        }
        remoteVideoRef.current.play();
      };

      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          socket.emit("add-ice-candidate", {
            candidate: e.candidate,
            type: "receiver",
            roomId,
          });
        }
      };

      await pc.setRemoteDescription(remoteSdp);
      const sdp = await pc.createAnswer();
      await pc.setLocalDescription(sdp);

      socket.emit("answer", {
        roomId,
        sdp,
      });
    });

    socket.on("answer", ({ roomId, sdp: remoteSdp }) => {
      setLobby(false);
      setRoomId(roomId);
      setSendingPc((pc) => {
        pc?.setRemoteDescription(remoteSdp);
        return pc;
      });
      console.log("loop closed");
    });

    socket.on("lobby", () => {
      setLobby(true);
    });

    socket.on("add-ice-candidate", ({ candidate, type }) => {
      if (type === "sender") {
        setReceivingPc((pc) => {
          pc?.addIceCandidate(candidate);
          return pc;
        });
      } else {
        setSendingPc((pc) => {
          pc?.addIceCandidate(candidate);
          return pc;
        });
      }
    });

    socket.on("chat-message", ({ sender, message }) => {
      setMessages((messages) => [...messages, { sender, text: message }]);
    });

    setSocket(socket);
  }, [name, localAudioTrack, localVideoTrack]);

  useEffect(() => {
    if (localVideoRef.current && localVideoTrack) {
      localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
      localVideoRef.current.play();
    }
  }, [localVideoTrack]);

  const sendMessage = () => {
    if (message.trim() && socket && roomId) {
      socket.emit("chat-message", { message, roomId });
      setMessages([...messages, { sender: name, text: message }]);
      setMessage("");
    }
  };

  const nextPerson = () => {
    if (socket) {
      socket.emit("leave-room");
      setLobby(true);
      setMessages([]);
      setMessage("");
      setRoomId(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Navbar */}
      <header className="flex items-center justify-between px-4 py-2 bg-white shadow border-b border-black/20">
        <h1 className="text-2xl font-bold text-gray-800">Omegle</h1>
        <div className="text-sm text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 mr-1 inline-block"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>Online: 1234</span>
        </div>
      </header>
      {lobby ? "Waiting to connect you to someone" : null}
      {/* Main */}
      <main className="flex-1 gap-1 overflow-auto p-4 bg-white flex justify-center">
        {/* Video Section */}
        <div className="flex flex-col space-y-4 w-1/2">
          <video
            ref={localVideoRef}
            autoPlay
            className="overflow-hidden shadow-lg w-full mx-auto p-4 h-full border-2 border-gray-300 rounded-md bg-black"
          ></video>
          <video
            ref={remoteVideoRef}
            autoPlay
            className="overflow-hidden shadow-lg w-full mx-auto p-4 h-full border-2 border-gray-300 rounded-md bg-black"
          ></video>
        </div>
        {/* Chat Box */}
        <div className="w-px bg-black/20 mx-4" />
        <div className="rounded-lg overflow-hidden shadow-lg bg-white max-w-3xl p-4 space-y-4 w-1/2 flex flex-col h-full">
          <div className="flex-1 overflow-auto space-y-4 w-full">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start gap-4 ${
                  msg.sender === name ? "justify-end" : ""
                }`}
              >
                {msg.sender !== name && (
                  <span className="relative flex shrink-0 overflow-hidden rounded-full w-10 h-10 border">
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                      {msg.sender[0].toUpperCase()}
                    </span>
                  </span>
                )}
                <div className={`text-sm ${msg.sender === name ? "text-right" : ""}`}>
                  <div className="font-semibold">{msg.sender}</div>
                  <div>{msg.text}</div>
                </div>
                {msg.sender === name && (
                  <span className="relative flex shrink-0 overflow-hidden rounded-full w-10 h-10 border">
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                      {msg.sender[0].toUpperCase()}
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-start justify-between px-4 py-2 bg-white shadow">
            <div className="flex-1 mr-4">
              <input
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full"
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
              />
            </div>
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-black text-white hover:bg-black/90 h-10 px-4 py-2 mr-2"
              onClick={sendMessage}
            >
              Send
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              onClick={nextPerson}
            >
              Next Person
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
