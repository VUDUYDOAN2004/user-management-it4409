const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect("mongodb+srv://20225178:111@cluster0.t6lpt93.mongodb.net/it4409?appName=Cluster0")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Error:", err));

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên không được để trống'],
    minlength: [2, 'Tên phải có ít nhất 2 ký tự'],
    trim: true
  },
  age: {
    type: Number,
    required: [true, 'Tuổi không được để trống'],
    min: [0, 'Tuổi phải >= 0']
  },
  email: {
    type: String,
    required: [true, 'Email không được để trống'],
    match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
    trim: true,
    unique: true
  },
  address: {
    type: String,
    trim: true,
    default: ""
  }
});

const User = mongoose.model("User", UserSchema);

app.get("/api/users", async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 5;
    const search = req.query.search ? req.query.search.trim() : "";

    if (page < 1) page = 1;
    if (limit > 50) limit = 50;

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { address: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({ page, limit, total, totalPages, data: users });
  } catch (err) {
    res.status(500).json({ error: "Lỗi máy chủ: " + err.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { name, age, email, address } = req.body;

    const cleanData = {
        name: name?.trim(),
        age: Number(age),
        email: email?.trim(),
        address: address?.trim()
    };

    const emailExists = await User.findOne({ email: cleanData.email });
    if (emailExists) {
        return res.status(400).json({ error: "Email này đã được sử dụng. Vui lòng chọn email khác!" });
    }

    const newUser = await User.create(cleanData);
    res.status(201).json({
      message: "Tạo người dùng thành công",
      data: newUser
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = {};

    if (req.body.name !== undefined) updateFields.name = req.body.name.trim();
    if (req.body.age !== undefined) updateFields.age = Number(req.body.age);
    if (req.body.address !== undefined) updateFields.address = req.body.address.trim();

    if (req.body.email !== undefined) {
        updateFields.email = req.body.email.trim();
        const emailExists = await User.findOne({ 
            email: updateFields.email, 
            _id: { $ne: id }
        });
        if (emailExists) {
            return res.status(400).json({ error: "Email này đã được sử dụng. Vui lòng chọn email khác!" });
        }
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    res.json({
      message: "Cập nhật người dùng thành công",
      data: updatedUser
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "ID người dùng không hợp lệ" });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    res.json({ message: "Xóa người dùng thành công" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});