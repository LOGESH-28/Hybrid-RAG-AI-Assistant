"""
Loki AI - Structure Checker & Auto-Fixer
Run this from your LOKI_AI root folder
"""
import os
import shutil
import sys

ROOT = os.getcwd()

print("=" * 60)
print("🔍 Loki AI - Structure Check")
print(f"📁 Root: {ROOT}")
print("=" * 60)

issues = []
fixes = []

# === Check 1: Required folders ===
required_folders = ["app", "data"]
for folder in required_folders:
    path = os.path.join(ROOT, folder)
    if os.path.exists(path):
        print(f"✅ /{folder} folder exists")
    else:
        print(f"❌ /{folder} folder MISSING")
        issues.append(f"Missing folder: {folder}")

# === Check 2: templates location ===
templates_in_app = os.path.exists(os.path.join(ROOT, "app", "templates"))
templates_in_root = os.path.exists(os.path.join(ROOT, "templates"))

if templates_in_app:
    print(f"⚠️  templates/ is inside app/ → should be in root")
    fixes.append("MOVE_TEMPLATES")
elif templates_in_root:
    print(f"✅ templates/ is in root")
else:
    print(f"❌ templates/ folder MISSING")
    issues.append("Missing templates folder")

# === Check 3: Core app files ===
core_files = ["app/main.py", "app/rag_engine.py", "app/build_index.py"]
for f in core_files:
    path = os.path.join(ROOT, f)
    if os.path.exists(path):
        print(f"✅ {f} exists")
    else:
        print(f"❌ {f} MISSING")
        issues.append(f"Missing: {f}")

# === Check 4: .env file ===
env_path = os.path.join(ROOT, ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        content = f.read()
    if "GROQ_API_KEY" in content and "your_groq_api_key" not in content:
        print(f"✅ .env exists with GROQ_API_KEY")
    else:
        print(f"⚠️  .env exists but GROQ_API_KEY not set properly")
        issues.append("GROQ_API_KEY not set in .env")
else:
    print(f"❌ .env file MISSING")
    issues.append("Missing .env file")

# === Check 5: FAISS index ===
faiss_root = os.path.join(ROOT, "faiss_index.idx")
faiss_app = os.path.join(ROOT, "app", "faiss_index.idx")
chunks_root = os.path.join(ROOT, "chunks.pkl")
chunks_app = os.path.join(ROOT, "app", "chunks.pkl")

if os.path.exists(faiss_root):
    print(f"✅ faiss_index.idx in root")
else:
    print(f"❌ faiss_index.idx MISSING from root")
    issues.append("faiss_index.idx not in root")

if os.path.exists(faiss_app):
    print(f"⚠️  faiss_index.idx duplicate in app/ → will remove")
    fixes.append("REMOVE_DUPLICATE_FAISS")

if os.path.exists(chunks_root):
    print(f"✅ chunks.pkl in root")
else:
    print(f"❌ chunks.pkl MISSING from root")
    issues.append("chunks.pkl not in root")

if os.path.exists(chunks_app):
    print(f"⚠️  chunks.pkl duplicate in app/ → will remove")
    fixes.append("REMOVE_DUPLICATE_CHUNKS")

# === Check 6: Junk files ===
junk_files = [
    "app/templates/python.py",
    "app/templates/test.py", 
    "chunks.npy",
    "app/chunks.npy"
]
for jf in junk_files:
    if os.path.exists(os.path.join(ROOT, jf)):
        print(f"⚠️  Junk file found: {jf} → will remove")
        fixes.append(f"REMOVE_JUNK:{jf}")

# === Check 7: Old model folder ===
model_folder = os.path.join(ROOT, "model")
if os.path.exists(model_folder):
    size_mb = sum(
        os.path.getsize(os.path.join(dp, f))
        for dp, dn, filenames in os.walk(model_folder)
        for f in filenames
    ) / (1024 * 1024)
    print(f"⚠️  Old model/ folder found ({size_mb:.0f} MB) → safe to delete manually")
    issues.append(f"Old FLAN-T5 model folder ({size_mb:.0f} MB) - delete manually to free space")

# === Check 8: __init__.py ===
init_path = os.path.join(ROOT, "app", "__init__.py")
if os.path.exists(init_path):
    print(f"✅ app/__init__.py exists")
else:
    print(f"⚠️  app/__init__.py missing → will create")
    fixes.append("CREATE_INIT")

# === Check 9: requirements.txt ===
req_path = os.path.join(ROOT, "requirements.txt")
if os.path.exists(req_path):
    with open(req_path) as f:
        reqs = f.read()
    if "groq" in reqs:
        print(f"✅ requirements.txt has groq")
    else:
        print(f"⚠️  requirements.txt missing 'groq' package")
        issues.append("requirements.txt needs groq package")
else:
    print(f"❌ requirements.txt MISSING")
    issues.append("Missing requirements.txt")

# === Summary ===
print("\n" + "=" * 60)
print(f"📊 SUMMARY: {len(issues)} issues, {len(fixes)} auto-fixes available")
print("=" * 60)

if issues:
    print("\n🔴 Issues Found:")
    for i, issue in enumerate(issues, 1):
        print(f"  {i}. {issue}")

if fixes:
    print(f"\n🔧 Auto-fixes ready ({len(fixes)} items)")
    confirm = input("\n❓ Apply all fixes now? (y/n): ").strip().lower()
    
    if confirm == 'y':
        print("\n🔧 Applying fixes...")
        
        for fix in fixes:
            if fix == "MOVE_TEMPLATES":
                src = os.path.join(ROOT, "app", "templates")
                dst = os.path.join(ROOT, "templates")
                shutil.move(src, dst)
                print(f"  ✅ Moved templates/ to root")

            elif fix == "REMOVE_DUPLICATE_FAISS":
                os.remove(os.path.join(ROOT, "app", "faiss_index.idx"))
                print(f"  ✅ Removed duplicate app/faiss_index.idx")

            elif fix == "REMOVE_DUPLICATE_CHUNKS":
                os.remove(os.path.join(ROOT, "app", "chunks.pkl"))
                print(f"  ✅ Removed duplicate app/chunks.pkl")

            elif fix == "CREATE_INIT":
                with open(os.path.join(ROOT, "app", "__init__.py"), "w") as f:
                    f.write("")
                print(f"  ✅ Created app/__init__.py")

            elif fix.startswith("REMOVE_JUNK:"):
                junk = fix.split(":", 1)[1]
                os.remove(os.path.join(ROOT, junk))
                print(f"  ✅ Removed {junk}")

        print("\n✅ All fixes applied!")
        print("\n📋 Next steps:")
        print("  1. Delete model/ folder manually (saves disk space)")
        print("  2. Set GROQ_API_KEY in .env file")
        print("  3. pip install -r requirements.txt")
        print("  4. uvicorn app.main:app --reload")
    else:
        print("⏭️  Fixes skipped. Run again and press 'y' to apply.")
else:
    print("\n🎉 Structure looks clean!")
    