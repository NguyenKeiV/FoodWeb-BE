// Sequelize Food Model Definition
module.exports = (sequelize, DataTypes) => {
  const Food = sequelize.define(
    "Food",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Tên món ăn không được để trống",
          },
          len: {
            args: [1, 255],
            msg: "Tên món ăn phải từ 1-255 ký tự",
          },
        },
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: "Số lượng không được âm",
          },
          isInt: {
            msg: "Số lượng phải là số nguyên",
          },
        },
      },
      img: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          isValidPath(value) {
            if (value && value.length > 500) {
              throw new Error("Đường dẫn hình ảnh quá dài");
            }
          },
        },
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: "Giá không được âm",
          },
          isDecimal: {
            msg: "Giá phải là số",
          },
        },
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
          len: {
            args: [0, 100],
            msg: "Danh mục không được quá 100 ký tự",
          },
        },
      },
    },
    {
      tableName: "foods",
      timestamps: true,
      paranoid: true, // Soft delete
      underscored: true, // Sử dụng snake_case cho timestamps
    }
  );

  // Class methods
  Food.associate = function (models) {
    // Định nghĩa associations nếu cần
    // Example: Food.belongsTo(models.Category, { foreignKey: 'category_id' });
    // Example: Food.hasMany(models.OrderItem, { foreignKey: 'food_id' });
  };

  return Food;
};
