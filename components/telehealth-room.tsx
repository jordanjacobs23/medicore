"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

type Props = {
  appointmentId: string;
  targetClerkId: string;
  role: "patient" | "practitioner";
  recordingConsent: boolean;
};

export function TelehealthRoom({ appointmentId, targetClerkId, role, recordingConsent }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [status, setStatus] = useState("Preparing secure media...");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");

  async function signal(kind: "offer" | "answer" | "ice", payload: unknown) {
    await fetch(`/api/telehealth/${appointmentId}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, payload, targetClerkId }),
    });
  }

  useEffect(() => {
    let mounted = true;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const peer = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        peerRef.current = peer;
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
        peer.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => remoteStreamRef.current.addTrack(track));
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
          setStatus("Connected");
        };
        peer.onicecandidate = (event) => {
          if (event.candidate) void signal("ice", event.candidate.toJSON());
        };
        peer.onconnectionstatechange = () => {
          if (peer.connectionState === "connected") setStatus("Connected");
          if (peer.connectionState === "failed" || peer.connectionState === "disconnected") setStatus("Connection interrupted");
        };

        await fetch(`/api/telehealth/${appointmentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join" }),
        });

        if (role === "practitioner") {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          await signal("offer", offer);
          setStatus("Waiting for patient...");
        } else {
          setStatus("Waiting for consultation to start...");
        }

        pollTimer = setInterval(async () => {
          if (!mounted) return;
          const response = await fetch(`/api/telehealth/${appointmentId}/signal`);
          if (!response.ok) return;
          const data = await response.json() as { signals: Array<{ kind: "offer" | "answer" | "ice"; payload: unknown }> };
          for (const item of data.signals) {
            if (item.kind === "offer") {
              await peer.setRemoteDescription(item.payload as RTCSessionDescriptionInit);
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              await signal("answer", answer);
            } else if (item.kind === "answer") {
              await peer.setRemoteDescription(item.payload as RTCSessionDescriptionInit);
            } else if (item.kind === "ice") {
              await peer.addIceCandidate(item.payload as RTCIceCandidateInit);
            }
          }
        }, 1000);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Camera or microphone access was denied.");
        setStatus("Media unavailable");
      }
    }

    void setup();
    return () => {
      mounted = false;
      if (pollTimer) clearInterval(pollTimer);
      peerRef.current?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  // Own Clerk ID is used by the server only and intentionally not repeated in the client effect.
  }, [appointmentId, role, targetClerkId]);

  function toggleTrack(kind: "video" | "audio") {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = kind === "video" ? stream.getVideoTracks() : stream.getAudioTracks();
    tracks.forEach((track) => { track.enabled = !track.enabled; });
    if (kind === "video") setCameraOn((current) => !current);
    if (kind === "audio") setMicOn((current) => !current);
  }

  async function toggleRecording() {
    setError("");
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      await fetch(`/api/telehealth/${appointmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "record-stop" }),
      });
      return;
    }
    if (!recordingConsent) {
      setError("The patient has not granted consultation recording consent.");
      return;
    }
    if (!("MediaRecorder" in window)) {
      setError("Local recording is not supported by this browser.");
      return;
    }
    const tracks = [...(localStreamRef.current?.getTracks() ?? []), ...remoteStreamRef.current.getTracks()];
    const combined = new MediaStream(tracks);
    try {
      const recorder = new MediaRecorder(combined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `medicore-consultation-${appointmentId}.webm`;
        link.click();
        URL.revokeObjectURL(url);
      };
      await fetch(`/api/telehealth/${appointmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "record-start" }),
      });
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Recording could not start.");
    }
  }

  async function endCall() {
    await fetch(`/api/telehealth/${appointmentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end" }),
    });
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    setStatus("Consultation ended");
  }

  return (
    <section className="mx-auto min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-white">
        <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Telehealth</p><p className="mt-1 text-sm text-slate-300">{status}</p></div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold capitalize">{role}</span>
      </header>
      {error ? <p role="alert" className="mx-4 mt-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      <div className="grid min-h-[520px] gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full min-h-[520px] w-full object-cover" />
          <video ref={localVideoRef} muted autoPlay playsInline className="absolute bottom-4 right-4 h-36 w-52 rounded-lg border border-slate-700 bg-slate-950 object-cover" />
        </div>
        <aside className="rounded-xl border border-slate-800 p-4 text-slate-300">
          <h2 className="font-semibold text-white">Consultation controls</h2>
          <p className="mt-2 text-xs leading-5">Camera and microphone controls apply to this browser. Recording is local and downloads when stopped.</p>
          {!recordingConsent ? <p className="mt-4 rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-200">Recording unavailable: patient consent is not active.</p> : null}
        </aside>
      </div>
      <footer className="flex flex-wrap justify-center gap-3 border-t border-slate-800 px-4 py-4">
        <button type="button" onClick={() => toggleTrack("audio")} className="flex size-11 items-center justify-center rounded-full bg-slate-800 text-white" aria-label={micOn ? "Mute microphone" : "Unmute microphone"}>{micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}</button>
        <button type="button" onClick={() => toggleTrack("video")} className="flex size-11 items-center justify-center rounded-full bg-slate-800 text-white" aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}>{cameraOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}</button>
        {role === "practitioner" ? <button type="button" onClick={toggleRecording} className={`h-11 rounded-full px-4 text-sm font-bold ${recording ? "bg-red-600 text-white" : "bg-slate-800 text-white"}`}>{recording ? "Stop recording" : "Start recording"}</button> : null}
        <button type="button" onClick={endCall} className="flex size-11 items-center justify-center rounded-full bg-red-600 text-white" aria-label="End consultation"><PhoneOff className="size-5" /></button>
      </footer>
    </section>
  );
}
