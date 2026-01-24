#!/usr/bin/env python3
"""
PDF 數位簽章腳本

使用 endesive 庫對 PDF 進行數位簽章。

環境變數：
  - PDF_SIGN_P12_PATH: PKCS12 憑證檔案路徑（必須）
  - PDF_SIGN_P12_PASSWORD: PKCS12 憑證密碼（選用，預設為空）
  - PDF_SIGN_REASON: 簽章原因（選用）
  - PDF_SIGN_LOCATION: 簽章地點（選用）
  - PDF_SIGN_CONTACT: 聯絡資訊（選用）

用法：
  python3 pdf_sign.py <input.pdf> <output.pdf>

錯誤代碼：
  0: 成功
  1: 參數錯誤
  2: 憑證未配置
  3: 憑證讀取失敗
  4: 簽章失敗
"""

import os
import sys
from datetime import datetime

def main():
    # 檢查參數
    if len(sys.argv) != 3:
        print("用法: python3 pdf_sign.py <input.pdf> <output.pdf>", file=sys.stderr)
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]

    # 檢查環境變數（支援預設憑證）
    p12_path = os.environ.get("PDF_SIGN_P12_PATH", "/app/certs/default.p12")
    p12_password = os.environ.get("PDF_SIGN_P12_PASSWORD", "")
    sign_reason = os.environ.get("PDF_SIGN_REASON", "ConvertX-CN PDF Packager")
    sign_location = os.environ.get("PDF_SIGN_LOCATION", "ConvertX-CN")
    sign_contact = os.environ.get("PDF_SIGN_CONTACT", "")

    if not os.path.exists(p12_path):
        print(f"錯誤: 憑證檔案不存在: {p12_path}", file=sys.stderr)
        print("提示: Docker 環境預設使用 /app/certs/default.p12", file=sys.stderr)
        print("      如需使用自訂憑證，請設定 PDF_SIGN_P12_PATH 環境變數", file=sys.stderr)
        sys.exit(2)

    if not os.path.exists(input_pdf):
        print(f"錯誤: 輸入檔案不存在: {input_pdf}", file=sys.stderr)
        sys.exit(1)

    try:
        # 載入 endesive
        from endesive.pdf import cms
        from cryptography.hazmat.primitives.serialization import pkcs12
        from cryptography.hazmat.backends import default_backend

        # 讀取 PKCS12 憑證
        print(f"[PDF Sign] 載入憑證: {p12_path}")
        with open(p12_path, "rb") as f:
            p12_data = f.read()

        try:
            private_key, certificate, additional_certs = pkcs12.load_key_and_certificates(
                p12_data,
                p12_password.encode() if p12_password else None,
                default_backend()
            )
        except Exception as e:
            print(f"錯誤: 無法載入憑證（密碼錯誤或格式不正確）: {e}", file=sys.stderr)
            sys.exit(3)

        if not private_key or not certificate:
            print("錯誤: 憑證中未找到私鑰或證書", file=sys.stderr)
            sys.exit(3)

        # 讀取 PDF
        print(f"[PDF Sign] 讀取 PDF: {input_pdf}")
        with open(input_pdf, "rb") as f:
            pdf_data = f.read()

        # 準備簽章參數
        dct = {
            "aligned": 0,
            "sigflags": 3,
            "sigflagsft": 132,
            "sigpage": 0,
            "sigbutton": False,
            "contact": sign_contact,
            "location": sign_location,
            "signingdate": datetime.utcnow().strftime("%Y%m%d%H%M%S+00'00'"),
            "reason": sign_reason,
        }

        # 執行簽章
        print("[PDF Sign] 執行數位簽章...")
        signed_data = cms.sign(
            pdf_data,
            dct,
            private_key,
            certificate,
            additional_certs or [],
            "sha256",
        )

        # 寫入輸出檔案
        print(f"[PDF Sign] 寫入簽章 PDF: {output_pdf}")
        with open(output_pdf, "wb") as f:
            f.write(pdf_data)
            f.write(signed_data)

        print("[PDF Sign] ✅ 簽章完成")
        sys.exit(0)

    except ImportError as e:
        print(f"錯誤: 缺少必要的 Python 庫: {e}", file=sys.stderr)
        print("請確保已安裝 endesive: pip install endesive", file=sys.stderr)
        sys.exit(4)

    except Exception as e:
        print(f"錯誤: 簽章失敗: {e}", file=sys.stderr)
        sys.exit(4)


if __name__ == "__main__":
    main()
