import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setDone(null);
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, role });
      setDone("Registered successfully. Please login.");
      setTimeout(() => nav("/login"), 600);
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 460, margin: "40px auto" }}>
      <h2>Register</h2>
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 10 }}>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: "100%" }}>
            <option value="TEACHER">TEACHER</option>
            <option value="STUDENT">STUDENT</option>
          </select>
        </div>
        {error && <div style={{ color: "crimson", marginBottom: 10 }}>{String(error)}</div>}
        {done && <div style={{ color: "green", marginBottom: 10 }}>{String(done)}</div>}
        <button disabled={loading} type="submit">
          {loading ? "Creating…" : "Register"}
        </button>
      </form>
      <div style={{ marginTop: 12 }}>
        Already have account? <Link to="/login">Login</Link>
      </div>
    </div>
  );
}
