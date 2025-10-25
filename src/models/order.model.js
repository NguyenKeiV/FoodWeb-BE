// models/orders.model.js
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      order_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: "Mã đơn hàng không được để trống",
          },
        },
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: "Số tiền không được âm",
          },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      items: {
        type: DataTypes.TEXT, // JSON string
        allowNull: true,
        get() {
          const rawValue = this.getDataValue("items");
          return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
          this.setDataValue("items", JSON.stringify(value));
        },
      },
      payment_method: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "PAYOS",
      },
      payment_status: {
        type: DataTypes.ENUM("PENDING", "PAID", "CANCELLED", "FAILED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      paid: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      transaction_data: {
        type: DataTypes.TEXT, // JSON string từ PayOS webhook
        allowNull: true,
        get() {
          const rawValue = this.getDataValue("transaction_data");
          return rawValue ? JSON.parse(rawValue) : null;
        },
        set(value) {
          this.setDataValue("transaction_data", JSON.stringify(value));
        },
      },
      shipping_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      shipping_fee: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
    },
    {
      tableName: "orders",
      timestamps: true,
      paranoid: false, // Tắt soft delete nếu chưa có cột deleted_at
      underscored: true,
    }
  );

  Order.associate = function (models) {
    // Order belongs to User
    Order.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Order;
};
