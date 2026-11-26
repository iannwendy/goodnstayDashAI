# goodNstay Analytics Notebooks (JupyterLab + BigQuery + OpenAI API)

Không gian **JupyterLab** chính thức cho stack **`GA4 → BigQuery (aevo-512307) ⇄ Jupyter ⇄ OpenAI API → Gold AI Mart → Partner Dashboard`**.

Thiết kế theo định hướng kiến trúc của CTO:
- **Jupyter** là *Sổ tay tính toán sống (Executable Lab Notebook)* phục vụ EDA, thử nghiệm phân cụm `C1–C4`, đánh giá Prompt và chạy lô `T-1` — **KHÔNG** nằm trên đường đi request realtime của Partner Dashboard.
- **`OPENAI_API_KEY` được gắn qua biến tạm (`.env`)** và bọc sau giao diện `AiAdvisorProvider` (`src/ai_provider.py`): khi chưa có key thật (hoặc ở chế độ `AI_PROVIDER_MODE=fallback`), toàn bộ notebook vẫn chạy xanh 100% bằng động cơ nội bộ, sẵn sàng cho lộ trình giảm dần sự phụ thuộc OpenAI API khi dữ liệu `goodNstay` đủ lớn.

---

## 1. Khởi Tạo Môi Trường Cô Lập (`.venv`)

```bash
cd analytics-notebooks
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Tạo file biến môi trường cục bộ (đã gitignore)
cp .env.example .env

# Đăng ký kernel Jupyter cho môi trường này
.venv/bin/python -m ipykernel install --user --name goodnstay-analytics --display-name "Python (goodNstay Analytics)"

# (Khuyến nghị) Tự động xóa cell output khi commit Git để chống lộ dữ liệu/PII
.venv/bin/nbstripout --install
```

*(Tùy chọn cho truy vấn BigQuery Live trên `aevo-512307`)*:
```bash
gcloud auth application-default login
gcloud config set project aevo-512307
```
> Nếu máy chưa bật GCP ADC hoặc đang offline, `src/bq_client.py` sẽ tự động chuyển về dữ liệu hạt giống tại `dashboard/dashboard/master-data/seed/bid_records.json` (`DATA_SOURCE_MODE=auto`).

---

## 2. Mở JupyterLab

```bash
cd analytics-notebooks
.venv/bin/jupyter lab
```

---

## 3. Cấu Trúc Thư Mục & 3 Notebook Cốt Lõi

```text
analytics-notebooks/
├── .env.example                                     # Mẫu biến môi trường (OPENAI_API_KEY biến tạm)
├── requirements.txt                                 # Danh sách thư viện Python cho .venv
├── src/
│   ├── config.py                                    # Đọc .env, nhận diện biến tạm OPENAI_API_KEY
│   ├── pii_scrubber.py                              # Che lọc SĐT, email, CCCD, URL, tên khách trước khi gọi AI
│   ├── bq_client.py                                 # Đọc BigQuery có maximum_bytes_billed + fallback seed JSON
│   ├── keyword_rules.py                             # Tầng 1 từ điển VI/EN/KO (KW_01..KW_16) + chấm điểm C1–C4
│   └── ai_provider.py                               # Provider Abstraction: OpenAI Structured Outputs / Fallback nội bộ
├── notebooks/
│   ├── 01_eda_ga4_funnel_and_pricing.ipynb          # EDA phễu 8 bước, vùng giá ngọt saving_pct & tương tác ảnh/video
│   ├── 02_freetext_keyword_tagging_and_clustering.ipynb # Che PII, bóc KW_01..KW_16, C1–C4 & thử nghiệm K-Means/Ward
│   └── 03_ai_advisor_prompt_eval_and_publish.ipynb  # Gắn tag `parameters` (Papermill), eval thẻ AI & dry-run ghi BigQuery
└── tests/
    └── test_notebooks_pipeline.py                   # Unit tests kiểm chứng PII, rules, BigQuery cap & AI fallback
```

---

## 4. Chạy Kiểm Thử & Chạy Tự Động Theo Lô (Papermill)

```bash
# Chạy unit tests
analytics-notebooks/.venv/bin/python -W error -m unittest discover -s analytics-notebooks/tests -v

# Chạy tự động notebook 03 với tham số ngày (output lưu vào thư mục gitignored `outputs/`)
mkdir -p analytics-notebooks/outputs
analytics-notebooks/.venv/bin/papermill \
  analytics-notebooks/notebooks/03_ai_advisor_prompt_eval_and_publish.ipynb \
  analytics-notebooks/outputs/03_run_2026-11-06.ipynb \
  -p RUN_DATE 2026-11-06 \
  -p ALLOW_BQ_WRITEBACK false
```

---

## 5. Nguyên Tắc An Toàn Bắt Buộc

1. **Tuyệt đối không commit `.env` hay key thật lên Git** — chỉ commit `.env.example` với giá trị tạm `sk-temp-placeholder-replace-me`.
2. **Luôn che lọc `PII` (`scrub_pii`)** trước khi bất kỳ chuỗi `notes` / `review` nào được gửi tới OpenAI API.
3. **Luôn giữ trần `BQ_MAX_BYTES_BILLED`** (mặc định `25 MiB`) và lọc theo `metric_date` trên mọi truy vấn BigQuery.
4. **Không commit cell output chứa bảng dữ liệu thật** trong `.ipynb` (sử dụng `nbstripout` hoặc xóa output trước khi commit).
